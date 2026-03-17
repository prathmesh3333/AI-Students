const TestResult = require("../models/TestResult");

const getCompletedTests = async (req, res) => {
    try {
        const { rollNo } = req.params;

        const results = await TestResult.find({ rollNo });

        const completedTestIds = results.map(r => r.testId.toString());

        res.json({
            success: true,
            completedTestIds
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch completed tests" });
    }
};

module.exports = { getCompletedTests };