
async function getPythonBillingSummary(payments) {
    try {
        const response = await fetch("/api/billing_summary", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                payments: payments.map(payment => ({
                    amount: payment.amount,
                    status: payment.status
                }))
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.error || "Unable to calculate billing."
            );
        }

        console.log("Python billing summary:", result);

        return result;
    } catch (error) {
        console.error("Python API error:", error);
        throw error;
    }
}

// Example: use this function with payment records
// already retrieved from Supabase.
async function testPythonBilling() {
    const samplePayments = [
        { amount: 2500, status: "Paid" },
        { amount: 2500, status: "Pending" },
        { amount: 1800, status: "Overdue" }
    ];

    try {
        const summary = await getPythonBillingSummary(
            samplePayments
        );

        console.log("Paid total:", summary.totals.Paid);
        console.log("Pending total:", summary.totals.Pending);
        console.log("Overdue total:", summary.totals.Overdue);
    } catch (error) {
        console.error("Billing test failed:", error.message);
    }
}
