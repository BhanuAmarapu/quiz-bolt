const calculateScore = (isCorrect, timeTaken, maxTime) => {
    if (!isCorrect) return 0;

    // Score = 1000 - (time_taken * 50)
    // Ensure score doesn't go below a base correct score, e.g., 100
    const score = Math.max(100, 1000 - (timeTaken * 50));
    return Math.round(score);
};

module.exports = { calculateScore };
