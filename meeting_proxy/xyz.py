import requests
import json

url = "https://www.rentfaster.ca/api/search.json"

response = requests.get(url)

data = response.json()

print(json.dumps(data, indent=2))