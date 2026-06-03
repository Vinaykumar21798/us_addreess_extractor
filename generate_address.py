import random

cities = [
    ("New York", "NY", "10001"),
    ("Los Angeles", "CA", "90001"),
    ("Chicago", "IL", "60601"),
    ("Houston", "TX", "77001"),
    ("Phoenix", "AZ", "85001"),
]

streets = [
    "Main Street",
    "Oak Avenue",
    "Pine Road",
    "Maple Drive",
    "Cedar Lane"
]

with open("1000_addresses.txt", "w", encoding="utf-8") as f:

    for i in range(1, 1001):

        city, state, zipcode = random.choice(cities)
        street = random.choice(streets)

        address = (
            f"{i} {street}\n"
            f"{city}, {state} {zipcode}\n\n"
        )

        f.write(address)

print("Generated 1000 addresses successfully!")