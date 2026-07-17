import json, re, os

frontend_conditions = [
    {"name": "Acne Vulgaris", "description": "Common skin condition causing pimples, blackheads, and inflamed lesions due to clogged hair follicles.", "symptoms": ["Whiteheads", "Blackheads", "Papules", "Pustules", "Cysts", "Oily skin"], "common_in": "Teenagers, young adults, hormonal fluctuations", "category": "Inflammatory", "severity": "moderate", "treatment_summary": "Benzoyl peroxide, salicylic acid, retinoids, antibiotics for severe cases"},
    {"name": "Rosacea", "description": "Chronic facial redness with visible blood vessels, flushing, and sometimes acne-like bumps.", "symptoms": ["Facial flushing", "Persistent redness", "Visible blood vessels", "Bumps & pimples", "Eye irritation"], "common_in": "Fair-skinned adults 30-50, family history", "category": "Vascular", "severity": "moderate", "treatment_summary": "Topical metronidazole, azelaic acid, laser therapy, sun protection"},
    {"name": "Atopic Dermatitis (Eczema)", "description": "Chronic inflammatory skin condition causing dry, itchy, and red patches, often with an allergic basis.", "symptoms": ["Intense itching", "Dry scaly patches", "Red inflamed skin", "Cracked skin", "Oozing when scratched"], "common_in": "Children, family history of allergies or asthma", "category": "Inflammatory", "severity": "moderate", "treatment_summary": "Moisturizers, topical corticosteroids, calcineurin inhibitors, avoiding triggers"},
    {"name": "Psoriasis", "description": "Autoimmune condition causing rapid skin cell buildup with thick, silvery-scaled plaques.", "symptoms": ["Thick red patches", "Silvery scales", "Dry cracked skin", "Itching & burning", "Joint pain"], "common_in": "Adults 15-35, family history, triggered by stress or infection", "category": "Autoimmune", "severity": "moderate", "treatment_summary": "Topical steroids, vitamin D analogs, phototherapy, biologics for severe cases"},
    {"name": "Contact Dermatitis", "description": "Allergic or irritant reaction to substances touching the skin.", "symptoms": ["Red rash", "Itching & burning", "Blisters", "Dry cracked skin", "Swelling at contact site"], "common_in": "Can affect anyone, common with jewelry, cosmetics, plants", "category": "Reaction", "severity": "mild", "treatment_summary": "Avoid allergen, topical corticosteroids, cold compresses, antihistamines"},
    {"name": "Melasma", "description": "Brown or gray-brown patches on the face, triggered by sun exposure and hormonal changes.", "symptoms": ["Symmetric brown patches", "Cheeks & forehead", "Upper lip & nose", "Worsens with sun"], "common_in": "Women during pregnancy, hormonal therapy, darker skin types", "category": "Pigmentary", "severity": "mild", "treatment_summary": "Sun protection, hydroquinone, azelaic acid, chemical peels, laser"},
    {"name": "Seborrheic Dermatitis", "description": "Scaly, oily patches on the scalp, face, and other sebum-rich areas.", "symptoms": ["Greasy yellowish scales", "Redness on scalp", "Flaking & dandruff", "Itching", "Affects eyebrows & nose folds"], "common_in": "Adults 30-60, infants (cradle cap)", "category": "Inflammatory", "severity": "mild", "treatment_summary": "Antifungal shampoos, topical corticosteroids, calcineurin inhibitors"},
    {"name": "Urticaria (Hives)", "description": "Raised, itchy welts caused by histamine release.", "symptoms": ["Raised red welts", "Intense itching", "Swelling (angioedema)", "Comes & goes quickly"], "common_in": "All ages, foods, medications, stress, heat", "category": "Reaction", "severity": "mild", "treatment_summary": "Antihistamines, avoid triggers, corticosteroids for severe episodes"},
    {"name": "Tinea (Ringworm, Athlete's Foot)", "description": "Fungal skin infection causing ring-shaped, scaly patches.", "symptoms": ["Circular red rash", "Scaling & peeling", "Itching", "Clear center healing"], "common_in": "Warm humid climates, athletes, communal showers, pets", "category": "Infectious", "severity": "mild", "treatment_summary": "Topical antifungals (clotrimazole, terbinafine), oral antifungals"},
    {"name": "Herpes Simplex (Cold Sores)", "description": "Viral infection causing small, painful blisters.", "symptoms": ["Tingling before outbreak", "Small fluid-filled blisters", "Crusting & healing", "Pain & burning"], "common_in": "Most adults carry HSV-1, transmitted through close contact", "category": "Infectious", "severity": "moderate", "treatment_summary": "Antiviral creams (acyclovir), oral antivirals for outbreaks"},
    {"name": "Actinic Keratosis", "description": "Rough, scaly precancerous patches on sun-damaged skin.", "symptoms": ["Rough scaly patches", "Red, brown, or flesh-colored", "Flat or raised", "Soreness or tenderness"], "common_in": "Fair-skinned adults over 40, chronic sun exposure", "category": "Growth", "severity": "severe", "treatment_summary": "Cryotherapy, topical chemotherapy (5-FU), photodynamic therapy"},
    {"name": "Basal Cell Carcinoma", "description": "Most common skin cancer, slowly growing on sun-exposed areas.", "symptoms": ["Pearl-like bump", "Flesh-colored or pink", "Visible blood vessels", "Open sore that won't heal"], "common_in": "Fair-skinned adults over 50, chronic sun exposure", "category": "Growth", "severity": "severe", "treatment_summary": "Surgical excision, Mohs surgery, cryotherapy, topical imiquimod"},
    {"name": "Squamous Cell Carcinoma", "description": "Second most common skin cancer, can spread if untreated.", "symptoms": ["Firm red nodule", "Scaly crusted surface", "Non-healing sore", "Elevated border"], "common_in": "Fair-skinned adults over 50, chronic sun exposure", "category": "Growth", "severity": "severe", "treatment_summary": "Surgical excision, Mohs surgery, radiation, chemotherapy"},
    {"name": "Malignant Melanoma", "description": "Most dangerous skin cancer, requires urgent treatment.", "symptoms": ["Asymmetrical mole", "Irregular borders", "Color variation", "Diameter >6mm"], "common_in": "Fair skin, severe sunburns, many moles, family history", "category": "Growth", "severity": "severe", "treatment_summary": "Surgical excision, sentinel lymph node biopsy, immunotherapy"},
    {"name": "Vitiligo", "description": "Autoimmune condition causing white patches due to loss of melanocytes.", "symptoms": ["White depigmented patches", "Symmetric distribution", "Around mouth & eyes", "Hands & genitals"], "common_in": "All skin types, often before age 20, family history", "category": "Autoimmune", "severity": "mild", "treatment_summary": "Topical corticosteroids, calcineurin inhibitors, phototherapy, skin grafting"},
    {"name": "Alopecia Areata", "description": "Autoimmune condition causing patchy hair loss.", "symptoms": ["Round bald patches", "Smooth scalp", "Nail pitting", "Can progress to total hair loss"], "common_in": "All ages, family history of autoimmune conditions", "category": "Autoimmune", "severity": "moderate", "treatment_summary": "Topical minoxidil, corticosteroids, JAK inhibitors"},
    {"name": "Keratosis Pilaris", "description": "Harmless condition causing small, rough bumps on skin.", "symptoms": ["Small rough bumps", "Flesh-colored or red", "Upper arms & thighs", "Worse in dry weather"], "common_in": "Children and adolescents, often with eczema or dry skin", "category": "Genetic", "severity": "mild", "treatment_summary": "Moisturizers with urea or lactic acid, gentle exfoliation, topical retinoids"},
    {"name": "Impetigo", "description": "Contagious bacterial skin infection common in children.", "symptoms": ["Red sores around nose & mouth", "Honey-colored crusts", "Oozing blisters", "Itching"], "common_in": "Children 2-5, poor hygiene, warm climates", "category": "Infectious", "severity": "mild", "treatment_summary": "Topical antibiotics (mupirocin), oral antibiotics for widespread infection"},
    {"name": "Cellulitis", "description": "Deep bacterial skin infection requiring prompt treatment.", "symptoms": ["Red swollen skin", "Warm to touch", "Pain & tenderness", "Fever & chills"], "common_in": "Adults, broken skin, diabetes, immunocompromised, obesity", "category": "Infectious", "severity": "severe", "treatment_summary": "Oral or IV antibiotics (cephalexin, clindamycin), elevation, pain management"},
    {"name": "Shingles (Herpes Zoster)", "description": "Painful blistering rash from chickenpox virus reactivation.", "symptoms": ["Burning pain before rash", "Blistering along nerve", "Red rash in band/line", "Severe nerve pain"], "common_in": "Adults over 50, immunocompromised, prior chickenpox", "category": "Infectious", "severity": "severe", "treatment_summary": "Antivirals (acyclovir, valacyclovir), pain management, vaccines"},
    {"name": "Molluscum Contagiosum", "description": "Viral skin infection causing dome-shaped bumps.", "symptoms": ["Small dome-shaped bumps", "Central indentation", "Flesh-colored", "Often asymptomatic"], "common_in": "Children 1-10, sexually active adults, immunocompromised", "category": "Infectious", "severity": "mild", "treatment_summary": "Often self-resolves, cryotherapy, curettage, topical cantharidin"},
    {"name": "Lichen Planus", "description": "Inflammatory condition causing itchy, purple bumps.", "symptoms": ["Purple flat bumps", "Intense itching", "White lacy patches in mouth", "Nail ridges"], "common_in": "Adults 30-60, associated with hepatitis C, stress triggers", "category": "Inflammatory", "severity": "moderate", "treatment_summary": "Topical corticosteroids, antihistamines, phototherapy, oral retinoids"},
    {"name": "Granuloma Annulare", "description": "Benign condition causing ring-shaped bumps.", "symptoms": ["Ring-shaped bumps", "Flesh-colored or red", "Hands & feet", "Usually asymptomatic"], "common_in": "Children and young adults, more common in women", "category": "Inflammatory", "severity": "mild", "treatment_summary": "Often self-resolves, topical corticosteroids, cryotherapy"},
    {"name": "Pityriasis Rosea", "description": "Self-limiting rash with herald patch.", "symptoms": ["Large herald patch first", "Smaller patches on trunk", "Christmas-tree pattern on back", "Mild itching"], "common_in": "Young adults 10-35, more common in spring/fall", "category": "Infectious", "severity": "mild", "treatment_summary": "Self-resolving, antihistamines for itch, topical corticosteroids"},
    {"name": "Dyshidrotic Eczema", "description": "Type of eczema with small, itchy blisters on hands and feet.", "symptoms": ["Small deep blisters", "Palms & fingers", "Intense itching", "Peeling & cracking"], "common_in": "Adults 20-40, stress, warm weather, nickel sensitivity", "category": "Inflammatory", "severity": "moderate", "treatment_summary": "Topical corticosteroids, soaking & drying, avoiding triggers"},
    {"name": "Hidradenitis Suppurativa", "description": "Chronic condition causing painful lumps in skin folds.", "symptoms": ["Painful deep lumps", "Armpits & groin", "Blackheads & scarring", "Draining tunnels"], "common_in": "Young adults, smokers, obesity, family history", "category": "Inflammatory", "severity": "severe", "treatment_summary": "Antibiotics, anti-inflammatories, biologics, laser, surgery"},
    {"name": "Erythema Nodosum", "description": "Inflammatory condition causing painful red nodules on shins.", "symptoms": ["Red tender nodules", "Shins & lower legs", "Pain & swelling", "Fever & joint pain"], "common_in": "Young women, infections, sarcoidosis, IBD", "category": "Inflammatory", "severity": "moderate", "treatment_summary": "Treat underlying cause, NSAIDs, rest, potassium iodide"},
    {"name": "Xerosis (Dry Skin)", "description": "Extremely dry skin from environmental factors or aging.", "symptoms": ["Dry scaly skin", "Tightness after washing", "Fine lines & cracking", "Itching"], "common_in": "Elderly, dry climates, frequent bathing, diabetes", "category": "Inflammatory", "severity": "mild", "treatment_summary": "Regular moisturizing, gentle cleansers, humidifiers, avoid hot showers"},
    {"name": "Sunburn", "description": "Acute skin damage from UV radiation.", "symptoms": ["Red painful skin", "Warm to touch", "Swelling", "Blisters in severe cases"], "common_in": "Anyone with sun exposure, fair skin more susceptible", "category": "Reaction", "severity": "mild", "treatment_summary": "Cool compresses, aloe vera, moisturizers, NSAIDs, hydration"},
    {"name": "Stretch Marks (Striae)", "description": "Linear scars from rapid skin stretching.", "symptoms": ["Linear streaks on skin", "Initially red or purple", "Fade to white over time", "Abdomen, thighs, breasts"], "common_in": "Pregnancy, puberty, rapid weight gain, corticosteroid use", "category": "Genetic", "severity": "mild", "treatment_summary": "Topical retinoids, laser therapy, microneedling, hyaluronic acid"},
    {"name": "Hyperhidrosis", "description": "Excessive sweating beyond normal thermoregulation.", "symptoms": ["Excessive sweating", "Palms, armpits, face", "Interferes with daily life", "Skin maceration"], "common_in": "Young adults, family history, anxiety, menopause, thyroid", "category": "Genetic", "severity": "mild", "treatment_summary": "Antiperspirants, iontophoresis, botulinum toxin, surgery"},
    {"name": "Folliculitis", "description": "Inflammation of hair follicles.", "symptoms": ["Small red bumps", "Pus-filled blisters", "Itching & burning", "Around hair follicles"], "common_in": "Hot tubs, shaving, tight clothing, diabetes", "category": "Infectious", "severity": "mild", "treatment_summary": "Topical antibiotics (clindamycin), antifungal washes, warm compresses"},
    {"name": "Sebaceous Cyst", "description": "Benign lump under skin filled with keratin.", "symptoms": ["Round movable lump", "Flesh-colored", "Central punctum (dark dot)", "Slow-growing"], "common_in": "Adults, acne-prone skin, genetic predisposition", "category": "Growth", "severity": "mild", "treatment_summary": "Often left alone, surgical excision for cosmetic reasons or infection"},
    {"name": "Dermatofibroma", "description": "Benign skin growth of fibrous tissue.", "symptoms": ["Firm raised nodule", "Brownish or pink", "Dimples when pinched", "Slow-growing"], "common_in": "Adults, more common in women, after minor injury", "category": "Growth", "severity": "mild", "treatment_summary": "Benign, can be left alone, surgical excision if symptomatic"},
    {"name": "Skin Tag (Acrochordon)", "description": "Small, soft, flesh-colored growths on a stalk.", "symptoms": ["Small soft growth", "Flesh-colored", "On a stalk", "Neck, armpits, groin"], "common_in": "Adults over 40, obesity, diabetes, pregnancy", "category": "Growth", "severity": "mild", "treatment_summary": "Benign, can be removed by snip excision, cryotherapy, or cautery"},
    {"name": "Chickenpox (Varicella)", "description": "Highly contagious viral infection causing itchy blisters.", "symptoms": ["Fever & fatigue first", "Red spots become blisters", "Intense itching", "Blisters crust over"], "common_in": "Children, unvaccinated individuals", "category": "Infectious", "severity": "moderate", "treatment_summary": "Antivirals (acyclovir), calamine lotion, antihistamines, vaccination"},
    {"name": "Warts (Verruca Vulgaris)", "description": "Benign skin growths caused by HPV.", "symptoms": ["Rough raised bumps", "Flesh-colored or gray", "Black dots", "Cauliflower-like surface"], "common_in": "Children, young adults, immunocompromised", "category": "Infectious", "severity": "mild", "treatment_summary": "Salicylic acid, cryotherapy, cantharidin, laser, immunotherapy"},
    {"name": "Candidiasis (Yeast Infection)", "description": "Fungal infection in moist skin folds.", "symptoms": ["Red moist rash", "Intense itching", "Satellite pustules", "Skin folds affected"], "common_in": "Infants, diabetics, antibiotic use, immunocompromised", "category": "Infectious", "severity": "mild", "treatment_summary": "Topical antifungals (clotrimazole, nystatin), oral fluconazole"},
    {"name": "Lupus Erythematosus", "description": "Autoimmune disease with skin involvement.", "symptoms": ["Butterfly rash on face", "Photosensitivity", "Scaly red patches", "Joint pain & swelling"], "common_in": "Women 15-45, African American & Hispanic, family history", "category": "Autoimmune", "severity": "severe", "treatment_summary": "Sun protection, antimalarials (hydroxychloroquine), corticosteroids"},
    {"name": "Scleroderma", "description": "Autoimmune condition causing hardening and tightening of skin.", "symptoms": ["Hardening of skin", "Tight shiny skin", "Raynaud's phenomenon", "Joint pain"], "common_in": "Women 30-50, family history", "category": "Autoimmune", "severity": "severe", "treatment_summary": "Immunosuppressants, physical therapy, blood pressure medications"},
    {"name": "Keloid", "description": "Excessive scar tissue growth beyond wound boundary.", "symptoms": ["Raised thick scar", "Extends beyond injury", "Shiny smooth surface", "Itching & tenderness"], "common_in": "Darker skin types, family history, young adults", "category": "Growth", "severity": "mild", "treatment_summary": "Corticosteroid injections, cryotherapy, silicone sheets, laser"},
    {"name": "Intertrigo", "description": "Inflammatory rash in skin folds.", "symptoms": ["Red raw rash", "Skin folds affected", "Burning & itching", "Odor if infected"], "common_in": "Infants, obese, diabetics, hot humid climates", "category": "Inflammatory", "severity": "mild", "treatment_summary": "Keep skin folds dry, barrier creams, antifungal powders"},
    {"name": "Miliaria (Heat Rash)", "description": "Blocked sweat ducts causing tiny bumps in hot conditions.", "symptoms": ["Tiny red bumps", "Prickling sensation", "No sweating in affected area", "Neck, chest, groin"], "common_in": "Infants, athletes, tropical climates, bedridden patients", "category": "Reaction", "severity": "mild", "treatment_summary": "Cool environment, loose clothing, calamine lotion"},
    {"name": "Poison Ivy/Oak/Sumac Dermatitis", "description": "Allergic contact dermatitis from plant oil.", "symptoms": ["Linear red blisters", "Intense itching", "Swelling", "Streaks where plant touched"], "common_in": "Outdoor workers, hikers, campers, gardeners", "category": "Reaction", "severity": "moderate", "treatment_summary": "Immediate washing, topical/oral corticosteroids, antihistamines"},
    {"name": "Nail Fungus (Onychomycosis)", "description": "Fungal infection of the nail.", "symptoms": ["Thickened nail", "Yellow or white discoloration", "Brittle crumbling nail", "Debris under nail"], "common_in": "Adults, athletes, diabetics, immunocompromised", "category": "Infectious", "severity": "mild", "treatment_summary": "Oral terbinafine, topical antifungal lacquer, laser therapy"},
]

def make_slug(name):
    slug = name.lower().replace(" ", "-")
    slug = slug.replace("(", "").replace(")", "").replace("'", "").replace("/", "-").replace(",", "")
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug

conditions_kb = []
for fc in frontend_conditions:
    entry = {
        "slug": make_slug(fc["name"]),
        "name": fc["name"],
        "category": fc["category"],
        "severity": fc["severity"],
        "description": fc["description"],
        "symptoms": fc["symptoms"],
        "causes": "",
        "treatment": fc["treatment_summary"],
        "risk_factors": fc["common_in"],
        "when_to_see_doctor": "",
        "seasonality": "",
        "common_in": fc["common_in"],
        "prevention": "",
        "pdf_source": False,
    }
    conditions_kb.append(entry)

# PDF medical source texts
pdf_data = {
    "acne-vulgaris": {
        "causes": "Acne is a disorder of the pilosebaceous unit influenced by androgens. The precursor lesion is the microcomedone which develops into non-inflammatory lesions (comedones) and inflammatory lesions (papules and pustules).",
        "seasonality": "Typically begins in adolescence (10-16 years). In girls may start as early as 10. Peaks at 13-16. Premenstrual exacerbation common in women. Late-onset acne (20s) more common in women.",
    },
    "psoriasis": {
        "causes": "Psoriasis is a common disease affecting about 3% of the population. It is linked to several genes with familial occurrence. It may be precipitated by hormonal changes, streptococcal throat infection, trauma, medications, and emotional stress.",
        "seasonality": "Often begins between 15-25 years. Can occur at any age. Typically waxes and wanes with periods of relapse and remission.",
    },
    "cellulitis": {
        "causes": "Infection of subcutaneous tissues caused by group A, C or haemolytic streptococcus. Usually follows a portal of entry such as leg ulcer, tinea pedis, eczema, or insect bite.",
        "seasonality": "More common in older people but can occur at any age.",
    },
    "atopic-dermatitis-eczema": {
        "causes": "Atopy means an inherited predisposition to eczema, asthma or hay fever. Atopic individuals may have one or all of these conditions.",
        "seasonality": "Usually begins between 3-12 months. Long-term condition that clears by puberty in 90% of individuals.",
    },
    "shingles-herpes-zoster": {
        "causes": "Reactivation of varicella zoster virus (chickenpox) lying dormant in the dorsal root ganglion. The virus travels down cutaneous nerves to infect epidermal cells.",
        "seasonality": "Can occur at any age. Post-herpetic neuralgia may persist for months or years in older people.",
    },
    "basal-cell-carcinoma": {
        "causes": "Due to cumulative sun damage. Occurs in fair-skinned people who have worked or had hobbies outdoors. Most occur on the face. Metastatic spread is rare.",
        "seasonality": "Most common in middle age or older.",
    },
    "squamous-cell-carcinoma": {
        "causes": "Invasive carcinoma arising from sun-damaged skin. Can arise from pre-existing lesions like Bowen's disease or actinic keratosis. Common on sun-exposed sites.",
        "seasonality": "Most common in middle age or older.",
    },
    "malignant-melanoma": {
        "causes": "Malignant tumour of pigment-producing cells (melanocytes). Two-thirds arise from normal skin, one-third from pre-existing moles. Can metastasise through lymphatic and circulatory systems.",
        "seasonality": "All age groups affected. Those with fair/red hair who burn rather than tan are at highest risk.",
    },
    "chickenpox-varicella": {
        "causes": "Varicella zoster virus. Commonly occurs in childhood. By age 10 most children in urban communities have been infected. Primary infection confers long-term immunity.",
        "seasonality": "Incubation period 13-17 days. Communicable from 5 days before rash until 6 days after.",
    },
    "impetigo": {
        "causes": "Superficial infection of the epidermis caused by Staphylococcus aureus or group A beta-haemolytic streptococcus. Entrance gained through broken skin.",
        "seasonality": "Common in childhood. Highly contagious.",
    },
    "miliaria-heat-rash": {
        "causes": "Obstruction of sweat glands. Most common in hot, humid conditions. Types include miliaria crystalline, rubra (prickly heat), profunda, and pustulosa.",
        "seasonality": "Common in infancy but may occur at any age. Typically in hot, humid conditions.",
    },
    "urticaria-hives": {
        "causes": "Caused by release of histamine and other chemicals from mast cells in the skin. This causes small blood vessels to leak, resulting in tissue swelling (weals).",
        "seasonality": "Affects both adults and children.",
    },
}

seasonality_extra = {
    "rosacea": "Often worsens with sun exposure, hot weather, spicy foods, and alcohol.",
    "seborrheic-dermatitis": "Often worsens in winter/dry conditions. May improve in summer with UV exposure.",
    "melasma": "Worsens with sun exposure. More noticeable in summer. Common during pregnancy and hormonal therapy.",
    "sunburn": "More common in summer and peak UV hours (10am-4pm). Risk increases at higher altitudes and near reflective surfaces.",
    "tinea-ringworm-athletes-foot": "More common in warm, humid months. Athlete's foot prevalent in summer.",
    "herpes-simplex-cold-sores": "Triggers include stress, illness, fever, sun exposure, and cold weather.",
    "molluscum-contagiosum": "More common in warm, humid conditions. Spreads in schools and swimming pools.",
    "pit-yriasis-rosea": "More common in spring and fall. Possibly viral etiology.",
    "folliculitis": "More common in hot, humid weather. Can occur after shaving or hot tub use.",
    "hidradenitis-suppurativa": "Flares more common in summer due to heat and sweating.",
    "contact-dermatitis": "Depends on allergen/irritant exposure, not seasonal per se.",
    "dyshidrotic-eczema": "More common in warm weather. Stress triggers. Associated with nickel sensitivity.",
    "hyperhidrosis": "Often worse in warm weather and during anxiety/stress.",
    "stretch-marks-striae": "Not seasonally dependent. Related to rapid growth, pregnancy, or weight gain.",
}

prevention_extra = {
    "acne-vulgaris": "Avoid squeezing comedones. Cleanse with gentle cleanser. Use non-comedogenic moisturizers. Benzoyl peroxide can prevent new lesions.",
    "rosacea": "SPF 50+ daily sunscreen. Avoid triggers: spicy foods, alcohol, extreme temperatures. Gentle skincare routine.",
    "atopic-dermatitis-eczema": "Complete emollient therapy: soap substitutes, bath oil, moisturizer. Cotton clothing. Avoid irritants. Maintain cool, humidified environment.",
    "psoriasis": "Avoid known triggers: stress, infections, skin injuries, certain medications. Moderate sun exposure. Maintain healthy weight.",
    "contact-dermatitis": "Identify and avoid triggering substances. Use barrier creams. Patch testing to identify allergens.",
    "melasma": "Strict sun protection: SPF 50+ daily, wide-brimmed hats, avoid peak sun hours. Gentle skincare without irritation.",
    "seborrheic-dermatitis": "Regular washing with medicated shampoos containing zinc pyrithione, ketoconazole, or selenium sulfide. Manage stress.",
    "urticaria-hives": "Identify and avoid triggers (foods, medications, physical stimuli). Antihistamines for prevention if chronic.",
    "tinea-ringworm-athletes-foot": "Keep feet dry. Wear flip-flops in communal showers. Avoid sharing towels. Treat pets if source of infection.",
    "herpes-simplex-cold-sores": "Avoid triggers. Sunscreen on lips. Lysine supplements may help some. Antiviral medication for frequent outbreaks.",
    "actinic-keratosis": "Strict sun protection. Regular skin checks. Treat promptly to prevent progression to SCC.",
    "basal-cell-carcinoma": "Sun protection from childhood. Regular skin examinations. Avoid tanning beds.",
    "squamous-cell-carcinoma": "Sun protection. Regular dermatology screening. Monitor sun-damaged skin.",
    "malignant-melanoma": "Sun protection from childhood. Regular skin checks. Monthly self-exams using ABCDE rule. Avoid tanning beds.",
    "vitiligo": "Sun protection on depigmented areas (they sunburn easily). Cosmetic camouflage. Avoid triggers if identifiable.",
    "alopecia-areata": "No proven prevention. Manage stress. Early treatment may help limit hair loss extent.",
    "keratosis-pilaris": "Regular moisturizing with urea or lactic acid. Gentle exfoliation. Humidifier in dry environments.",
    "impetigo": "Good hygiene: regular handwashing, avoid sharing towels and facecloths, keep nails short.",
    "cellulitis": "Keep skin clean and moisturized. Promptly treat cuts, scrapes, and fungal infections like athlete's foot. Manage diabetes if present.",
    "shingles-herpes-zoster": "Vaccination (Shingrix) recommended for adults 50+ and immunocompromised. Healthy lifestyle to maintain immune function.",
    "molluscum-contagiosum": "Good hygiene. Avoid sharing towels. Do not scratch lesions. Keep lesions covered.",
    "lichen-planus": "Avoid known triggers. Manage stress. Good oral hygiene. Avoid tobacco and alcohol if oral lesions present.",
    "granuloma-annulare": "No known prevention. Condition is benign and often self-resolving.",
    "pit-yriasis-rosea": "No known prevention. Condition is self-limiting and typically resolves in 6-8 weeks.",
    "dyshidrotic-eczema": "Avoid triggers: stress, nickel, cobalt. Use gentle cleansers. Keep hands dry. Identify contact allergens.",
    "hidradenitis-suppurativa": "Weight management. Smoking cessation. Loose-fitting clothing. Gentle cleansing with antiseptic washes.",
    "erythema-nodosum": "Treat underlying cause. Leg elevation. Support stockings. Bed rest during acute phase.",
    "xerosis-dry-skin": "Regular moisturizing. Gentle cleansers. Humidifier in dry climates. Avoid hot showers. Drink adequate water.",
    "sunburn": "SPF 30+ broad spectrum sunscreen. Reapply every 2 hours. Seek shade 10am-4pm. Protective clothing and hats.",
    "stretch-marks-striae": "Maintain stable weight. Keep skin well-hydrated. Gentle exfoliation. Moisturize during pregnancy.",
    "hyperhidrosis": "Clinical strength antiperspirants. Avoid triggers (spicy foods, caffeine). Wear breathable fabrics.",
    "folliculitis": "Shave in direction of hair growth. Use clean razors. Avoid tight clothing. Avoid hot tubs if prone.",
    "sebaceous-cyst": "Not preventable. Do not squeeze. Seek removal if inflamed or for cosmetic reasons.",
    "dermatofibroma": "No prevention needed. Benign condition.",
    "skin-tag-acrochordon": "Weight management. Avoid friction in skin folds. Not preventable in most cases.",
    "chickenpox-varicella": "Vaccination (Varicella vaccine) is highly effective and recommended for children.",
    "warts-verruca-vulgaris": "Avoid touching warts on others. Keep feet covered in communal areas. Do not bite nails or pick at warts.",
    "candidiasis-yeast-infection": "Keep skin dry. Wear breathable fabrics. Manage diabetes. Avoid unnecessary antibiotics.",
    "lupus-erythematosus": "Strict sun protection. Avoid UV light. Healthy lifestyle. Early treatment of flares.",
    "scleroderma": "No proven prevention. Early diagnosis and treatment of complications. Keep warm to manage Raynaud's.",
    "keloid": "Avoid unnecessary skin trauma in prone individuals. Silicone sheets after surgery. Pressure therapy.",
    "intertrigo": "Keep skin folds clean and dry. Use barrier creams. Absorbent powders. Wear breathable clothing.",
    "miliaria-heat-rash": "Cool environment. Loose, breathable cotton clothing. Cool showers. Avoid heavy creams and ointments.",
    "poison-ivy-oak-sumac-dermatitis": "Learn to identify plants. Wear protective clothing. Wash skin immediately after exposure. Wash exposed clothing/tools.",
    "nail-fungus-onychomycosis": "Keep feet clean and dry. Trim nails straight across. Wear breathable shoes. Avoid nail salons with poor hygiene.",
}

doctor_extra = {
    "acne-vulgaris": "If OTC treatments ineffective for 2-3 months. If severe cysts or nodules develop. If scarring occurs. If causing psychological distress.",
    "rosacea": "If persistent facial redness. If eye symptoms (dryness, irritation, swelling). If bumps are painful.",
    "atopic-dermatitis-eczema": "If severe itching disturbs sleep. If signs of infection (weeping, crusting, fever). If condition significantly impacts quality of life.",
    "psoriasis": "If more than 30% of body surface affected. If joint pain develops (possible psoriatic arthritis). If pustular or erythrodermic forms appear (EMERGENCY).",
    "contact-dermatitis": "If severe blistering. If cause cannot be identified. If infection suspected. If facial or genital involvement.",
    "melasma": "If pigmentation persists despite sun protection. If affecting quality of life.",
    "seborrheic-dermatitis": "If over-the-counter treatments are ineffective after 4 weeks. If severe itching or inflammation. If hair loss occurs.",
    "urticaria-hives": "EMERGENCY: If accompanied by difficulty breathing, throat/tongue swelling. If chronic (lasting >6 weeks). If unknown cause.",
    "tinea-ringworm-athletes-foot": "If OTC antifungals fail after 2 weeks. If nails are involved. If condition spreads rapidly.",
    "herpes-simplex-cold-sores": "If outbreaks are frequent (>6/year) or severe. If lesions don't heal within 2 weeks. If immunocompromised.",
    "actinic-keratosis": "ALL cases should be evaluated. If lesions become tender, bleed, or grow rapidly.",
    "basal-cell-carcinoma": "ANY suspicious lesion needs dermatology evaluation. If sore doesn't heal within 3-4 weeks.",
    "squamous-cell-carcinoma": "URGENT: Any firm, growing nodule or non-healing sore on sun-exposed skin.",
    "malignant-melanoma": "EMERGENCY: Use ABCDE rule (Asymmetry, Border irregular, Color variation, Diameter >6mm, Evolving). Early detection saves lives.",
    "vitiligo": "If depigmentation spreads rapidly. If affecting quality of life. To discuss treatment options.",
    "alopecia-areata": "If hair loss is rapid or extensive. If affecting eyebrows/eyelashes. For treatment options including JAK inhibitors.",
    "keratosis-pilaris": "Not medically necessary. If skin feels rough or appearance is bothersome despite moisturizing.",
    "impetigo": "If widespread. If fever develops. If not improving after 48 hours of OTC treatment. Prompt treatment prevents spread.",
    "cellulitis": "EMERGENCY: Seek immediate care for red, swollen, warm skin. Especially with fever, chills, or red streaks.",
    "shingles-herpes-zoster": "Within 48 hours of rash for antivirals. EMERGENCY if eye involvement. If severe pain. If immunocompromised.",
    "molluscum-contagiosum": "If widespread (>20 lesions). If on face or genitals. If immunocompromised. If lesions become red and painful.",
    "lichen-planus": "If oral lesions cause burning pain. If widespread. If nail destruction occurs. To differentiate from other conditions.",
    "granuloma-annulare": "Usually benign. If widespread form appears. If diagnosis uncertain.",
    "pit-yriasis-rosea": "To confirm diagnosis and rule out secondary syphilis or psoriasis. If severe itching.",
    "dyshidrotic-eczema": "If unable to use hands normally. If secondary infection suspected. If persistent despite treatment.",
    "hidradenitis-suppurativa": "If recurrent painful lumps. Early referral to dermatology improves outcomes. If draining sinus tracts form.",
    "erythema-nodosum": "To identify underlying cause. If fever, joint pain, or gastrointestinal symptoms present. If lesions ulcerate.",
    "xerosis-dry-skin": "If severe itching interferes with sleep. If skin cracks or bleeds. If signs of infection.",
    "sunburn": "If severe blistering over large area. If fever, chills, nausea. If signs of heat exhaustion or heatstroke.",
    "stretch-marks-striae": "Not medically necessary. If rapid onset with other symptoms (Cushing's syndrome). For cosmetic concerns.",
    "hyperhidrosis": "If excessive sweating interferes with daily activities. If social anxiety develops. If accompanied by weight loss or fever.",
    "folliculitis": "If condition spreads or recurs frequently. If painful or with fever. If hot tub use and pseudomonas suspected.",
    "sebaceous-cyst": "If becomes red, painful, or inflamed (infected). If rapidly growing. If in a cosmetically concerning area.",
    "dermatofibroma": "Not medically necessary. If changes in color, size, or becomes painful.",
    "skin-tag-acrochordon": "Not medically necessary. If becomes irritated or bleeds. For cosmetic removal.",
    "chickenpox-varicella": "If adult with chickenpox (more severe). If immunocompromised. If difficulty breathing. If signs of bacterial superinfection.",
    "warts-verruca-vulgaris": "If painful. If spreading rapidly. If home treatments fail. If on face or genitals.",
    "candidiasis-yeast-infection": "If severe or recurrent. If diabetic. If immunocompromised. If OTC treatments fail.",
    "lupus-erythematosus": "If butterfly rash or photosensitivity. If fatigue, joint pain, fever. EMERGENCY if kidney involvement suspected.",
    "scleroderma": "If skin hardening or Raynaud's. If difficulty swallowing. If shortness of breath. Early treatment of organ involvement.",
    "keloid": "If growing rapidly. If painful or itchy. If affecting movement or appearance.",
    "intertrigo": "If not improving with basic care. If foul odor or discharge (secondary infection). If diabetic.",
    "miliaria-heat-rash": "If severe discomfort. If pustules present. If not resolving with cooling measures.",
    "poison-ivy-oak-sumac-dermatitis": "If severe or widespread. If on face or genitals. If not improving with OTC treatments.",
    "nail-fungus-onychomycosis": "If causing pain or difficulty walking. If diabetic (higher complication risk). If OTC treatments fail after 3 months.",
}

for entry in conditions_kb:
    slug = entry["slug"]
    if slug in pdf_data:
        entry["pdf_source"] = True
        entry["causes"] = pdf_data[slug].get("causes", "")
        if not entry["seasonality"]:
            entry["seasonality"] = pdf_data[slug].get("seasonality", "")
    if slug in seasonality_extra:
        entry["seasonality"] = seasonality_extra[slug]
    if slug in prevention_extra:
        entry["prevention"] = prevention_extra[slug]
    if slug in doctor_extra:
        entry["when_to_see_doctor"] = doctor_extra[slug]
    if not entry["prevention"]:
        entry["prevention"] = "Maintain good skin hygiene. Moisturize regularly. Protect skin from excessive sun exposure."
    if not entry["when_to_see_doctor"]:
        entry["when_to_see_doctor"] = "If symptoms persist despite home care, worsen significantly, or if diagnosis is uncertain."
    if not entry["seasonality"]:
        entry["seasonality"] = "Not specifically seasonal. Can occur year-round."

os.makedirs("D:/myprojects/Ai skin specialist/backend/data", exist_ok=True)
with open("D:/myprojects/Ai skin specialist/backend/data/conditions_kb.json", "w", encoding="utf-8") as f:
    json.dump(conditions_kb, f, indent=2, ensure_ascii=False)
print(f"Created conditions_kb.json with {len(conditions_kb)} conditions")
for c in conditions_kb:
    print(f"  - {c['slug']}: PDF={c['pdf_source']}")
