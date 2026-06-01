TREATMENTS = {
    "banana_bacterial_wilt": {
        "immediate": [
            "Immediately uproot and destroy all infected banana mats by burying or burning.",
            "Apply a disinfectant (e.g., Jik/bleach 1:4 dilution) to cutting tools after every use.",
            "Avoid moving soil or plant material from infected to healthy fields.",
            "Report the outbreak to the nearest agricultural extension office for containment.",
        ],
        "chemical": [
            "No effective chemical cure exists for Banana Bacterial Wilt.",
            "Focus on cultural control and strict quarantine measures.",
        ],
        "cultural": [
            "Use only certified disease-free planting materials.",
            "Practice crop rotation — avoid replanting bananas on infected land for at least 6 months.",
            "Control insect vectors (especially bees and fruit bats) by removing male buds regularly.",
        ],
    },
    "coffee_leaf_rust": {
        "immediate": [
            "Prune and remove all rust-infected leaves and branches immediately.",
            "Collect and burn fallen leaves to reduce spore load in the field.",
            "Apply copper-based fungicides (e.g., Copper oxychloride 50 WP at 3 g/L water).",
        ],
        "chemical": [
            "Apply systemic fungicides like Triadimefon or Propiconazole at first sign of infection.",
            "Alternate fungicide groups to prevent resistance development.",
            "Spray every 14-21 days during the rainy season.",
        ],
        "cultural": [
            "Improve air circulation by pruning dense canopy and maintaining proper spacing.",
            "Maintain optimal shade levels (30-40% shade cover).",
            "Use resistant coffee varieties (e.g., Ruiru 11, Batian, SL28).",
            "Apply adequate mulch and maintain soil fertility.",
        ],
    },
}

PREVENTION = {
    "banana_bacterial_wilt": [
        "Always disinfect farm tools (pangas, hoes, knives) before and after working with each plant.",
        "Remove male buds (de-budding) regularly to discourage insect vectors.",
        "Plant only certified disease-free banana suckers from trusted sources.",
        "Maintain field hygiene — remove weeds and volunteer plants.",
        "Report any suspicious wilting to extension officers immediately.",
        "Establish a farm quarantine period of 6-12 months before replanting bananas.",
    ],
    "coffee_leaf_rust": [
        "Plant rust-resistant coffee varieties adapted to your region.",
        "Maintain proper plant spacing (8-10 ft between rows, 6-8 ft within rows).",
        "Prune regularly to ensure good air circulation and light penetration.",
        "Apply fungicides preventively at the start of the rainy season.",
        "Monitor fields weekly during wet weather for early rust symptoms.",
        "Maintain soil nutrition — well-fed coffee plants are more tolerant to rust.",
        "Strip pick all ripe and overripe cherries to reduce disease pressure.",
    ],
}

BEST_PRACTICES = [
    "Maintain a farm record book — note planting dates, sprays, and observations.",
    "Attend farmer field schools and extension training sessions.",
    "Practice intercropping with compatible crops (e.g., beans, groundnuts).",
    "Apply organic manure and recommended fertilizers based on soil testing.",
    "Mulch around plants to retain moisture and suppress weeds.",
    "Prune and de-sucker bananas regularly for optimal yield.",
    "For coffee, maintain shade trees (e.g., Grevillea, Albizia) at recommended densities.",
    "Ensure proper drainage — waterlogging promotes root diseases.",
    "Harvest only at optimal maturity to maintain quality.",
    "Join a farmer cooperative for better access to inputs and markets.",
]


def generate_advisory(crop: str, symptoms: dict, severity: str, disease: str):
    disease = disease.lower().replace(" ", "_")
    treatment = TREATMENTS.get(disease, {})
    prevention = PREVENTION.get(disease, [])

    treatment_items = []
    for category, items in treatment.items():
        treatment_items.extend(items)

    return {
        "treatment": treatment_items,
        "prevention": prevention,
        "bestPractices": BEST_PRACTICES,
    }
