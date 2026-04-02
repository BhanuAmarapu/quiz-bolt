import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import Card from '../components/ui/Card';
import InputField from '../components/ui/InputField';
import Button from '../components/ui/Button';

const Profile = () => {
    const { user, updateProfile } = useAuth();
    const { getProfileCached, setProfileCached } = useAppData();
    const [name, setName] = useState(user?.name || '');
    const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const hydrateProfile = async () => {
            try {
                const profile = await getProfileCached();
                setName(profile?.name || '');
                setProfilePhoto(profile?.profilePhoto || '');
            } catch {
                // Keep local auth values as fallback if profile fetch fails.
                setName(user?.name || '');
                setProfilePhoto(user?.profilePhoto || '');
            } finally {
                setLoading(false);
            }
        };

        hydrateProfile();
    }, [getProfileCached, user]);

    const initials = useMemo(() => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }, [name]);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim()) {
            setError('Name is required.');
            return;
        }

        setSaving(true);
        try {
            const updated = await updateProfile({ name: name.trim(), profilePhoto: profilePhoto.trim() });
            setProfileCached(updated);
            setSuccess('Profile updated successfully.');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto px-6 py-10">
                <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
                    <p className="text-slate-500 font-medium">Loading profile...</p>
                </Card>
            </div>
        );
    }

    return (
        <div className=" mx-auto px-6 py-10">
            <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-8">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-indigo-50 border border-gray-200 flex items-center justify-center text-indigo-600 font-black text-xl">
                        {profilePhoto ? (
                            <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Profile</h1>
                        <p className="text-sm text-slate-500">Update your name and profile photo.</p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Email</label>
                        <InputField
                            value={user?.email || ''}
                            disabled
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Display Name</label>
                        <InputField
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Profile Photo URL</label>
                        <InputField
                            value={profilePhoto}
                            onChange={(e) => setProfilePhoto(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="https://example.com/photo.jpg"
                        />
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                    {success && <p className="text-sm text-emerald-600 font-medium">{success}</p>}

                    <Button
                        type="submit"
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default Profile;
