
from http.server import BaseHTTPRequestHandler
import json
from decimal import Decimal, InvalidOperation


class handler(BaseHTTPRequestHandler):

    def send_json(self, status_code, data):
        body = json.dumps(data).encode("utf-8")

        self.send_response(status_code)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.send_json(200, {
            "success": True,
            "endpoint": "/api/billing_summary",
            "method": "POST",
            "message": "Send a JSON array of payments using POST."
        })

    def do_POST(self):
        try:
            length = int(
                self.headers.get("Content-Length", "0")
            )

            if length <= 0 or length > 1_000_000:
                self.send_json(400, {
                    "success": False,
                    "error": "Request body is missing or too large."
                })
                return

            raw_body = self.rfile.read(length)
            payload = json.loads(raw_body)

            if not isinstance(payload, dict):
                self.send_json(400, {
                    "success": False,
                    "error": "Expected a JSON object."
                })
                return

            payments = payload.get("payments")

            if not isinstance(payments, list):
                self.send_json(400, {
                    "success": False,
                    "error": "Payments must be a list."
                })
                return

            if len(payments) > 10000:
                self.send_json(400, {
                    "success": False,
                    "error": "Too many payment records."
                })
                return

            totals = {
                "Paid": Decimal("0"),
                "Pending": Decimal("0"),
                "Overdue": Decimal("0")
            }

            counts = {
                "Paid": 0,
                "Pending": 0,
                "Overdue": 0
            }

            for payment in payments:
                if not isinstance(payment, dict):
                    raise ValueError(
                        "Each payment must be an object."
                    )

                status = payment.get("status")

                if status not in totals:
                    continue

                try:
                    amount = Decimal(
                        str(payment.get("amount", "0"))
                    )
                except (InvalidOperation, ValueError):
                    raise ValueError(
                        "Payment amounts must be numeric."
                    )

                if not amount.is_finite() or amount < 0:
                    raise ValueError(
                        "Amounts must be finite and non-negative."
                    )

                totals[status] += amount
                counts[status] += 1

            self.send_json(200, {
                "success": True,
                "currency": "PHP",
                "payment_count": len(payments),
                "totals": {
                    status: float(amount)
                    for status, amount in totals.items()
                },
                "counts": counts,
                "message": "Billing summary calculated successfully."
            })

        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {
                "success": False,
                "error": "Invalid JSON request."
            })

        except ValueError as error:
            self.send_json(400, {
                "success": False,
                "error": str(error)
            })

        except Exception:
            self.send_json(500, {
                "success": False,
                "error": "An internal server error occurred."
            })

