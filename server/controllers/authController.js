const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
};

const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: normalizedEmail, password: hashedPassword, role });

    if (user) {
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        await user.setRefreshToken(refreshToken);
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePhoto: user.profilePhoto,
            role: user.role,
            token: accessToken,
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && (await bcrypt.compare(password, user.password))) {
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        await user.setRefreshToken(refreshToken);
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePhoto: user.profilePhoto,
            role: user.role,
            token: accessToken,
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

const refresh = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !(await user.matchesRefreshToken(refreshToken))) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        await user.setRefreshToken(newRefreshToken);
        await user.save();

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ token: newAccessToken });
    } catch (err) {
        return res.status(401).json({ message: 'Expired refresh token' });
    }
};

const logoutUser = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (user && (await user.matchesRefreshToken(refreshToken))) {
                user.refreshToken = null;
                await user.save();
            }
        } catch {
            // Fallback for legacy plain-text stored tokens.
            const user = await User.findOne({ refreshToken });
            if (user) {
                user.refreshToken = null;
                await user.save();
            }
        }
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
};

const getMyProfile = async (req, res) => {
    res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        profilePhoto: req.user.profilePhoto || '',
        role: req.user.role,
    });
};

const updateMyProfile = async (req, res) => {
    const { name, profilePhoto } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (typeof name === 'string' && name.trim()) {
        user.name = name.trim();
    }

    if (typeof profilePhoto === 'string') {
        user.profilePhoto = profilePhoto.trim();
    }

    await user.save();

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePhoto: user.profilePhoto || '',
        role: user.role,
    });
};

module.exports = { registerUser, loginUser, refresh, logoutUser, getMyProfile, updateMyProfile };
