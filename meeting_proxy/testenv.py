import base64

raw_key = "ZnJvbnRkZXNrYWlzeXN0ZW1zQGdtYWlsLmNvbQ:RBFT1w9FmlBXvTPrOGH-x"
encoded_key = base64.b64encode(raw_key.encode()).decode()

print(encoded_key)