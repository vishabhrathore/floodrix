import json

file_path = "/home/vishabh/Downloads/betwa_river_suh_pmf_export.json"

with open(file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print("Updating node_cc_lookup...")
for node in data["nodes"]:
    if node["id"] == "node_cc_lookup":
        # 1. Update coefficient table
        new_code = (
            "// CWC sub-zone regression coefficients\n"
            "const table = {\n"
            '  "3a":  {a_tp:0.433,  b_tp:0.704,   a_qp:1.161,  b_qp:0.635,   a_TB:8.375, b_TB:0.512, a_W50:2.284, b_W50:1.000,  a_W75:1.331, b_W75:0.991,  a_WR50:0.827, b_WR50:1.023, a_WR75:0.561, b_WR75:1.037},\n'
            '  "3b":  {a_tp:0.523,  b_tp:0.323,   a_qp:1.915,  b_qp:-0.780,  a_TB:6.908, b_TB:0.592, a_W50:1.830, b_W50:-0.970, a_W75:0.924, b_W75:-0.792, a_WR50:0.745, b_WR50:-0.725, a_WR75:0.434, b_WR75:-0.616},\n'
            '  "3c":  {a_tp:0.854,  b_tp:0.280,   a_qp:2.009,  b_qp:-0.850,  a_TB:4.840, b_TB:0.740, a_W50:2.259, b_W50:-1.080, a_W75:1.519, b_W75:-0.990, a_WR50:0.844, b_WR50:-1.240, a_WR75:0.583, b_WR75:-1.190},\n'
            '  "3d":  {a_tp:1.757,  b_tp:0.261,   a_qp:1.260,  b_qp:-0.725,  a_TB:5.411, b_TB:0.826, a_W50:1.974, b_W50:-1.104, a_W75:0.961, b_W75:-1.125, a_WR50:1.150, b_WR50:-0.829, a_WR75:0.527, b_WR75:-0.932},\n'
            '  "3e":  {a_tp:0.727,  b_tp:0.590,   a_qp:2.020,  b_qp:0.880,   a_TB:5.485, b_TB:0.730, a_W50:2.228, b_W50:1.040,  a_W75:1.301, b_W75:0.960,  a_WR50:0.880, b_WR50:1.010, a_WR75:0.540, b_WR75:0.960},\n'
            '  "3f":  {a_tp:0.348,  b_tp:0.454,   a_qp:1.842,  b_qp:-0.804,  a_TB:4.589, b_TB:0.894, a_W50:2.353, b_W50:-1.005, a_W75:1.351, b_W75:-0.992, a_WR50:0.936, b_WR50:-1.047, a_WR75:0.579, b_WR75:-1.004},\n'
            '  "3h":  {a_tp:0.325,  b_tp:0.447,   a_qp:0.996,  b_qp:-0.497,  a_TB:7.392, b_TB:0.524, a_W50:2.389, b_W50:-1.065, a_W75:1.415, b_W75:-1.067, a_WR50:0.755, b_WR50:-1.229, a_WR75:0.558, b_WR75:-1.088},\n'
            '  "3i":  {a_tp:0.553,  b_tp:0.405,   a_qp:2.043,  b_qp:0.872,   a_TB:5.083, b_TB:0.733, a_W50:2.197, b_W50:1.067,  a_W75:1.325, b_W75:1.088,  a_WR50:0.799, b_WR50:1.138, a_WR75:0.536, b_WR75:1.109},\n'
            '  "2a":  {a_tp:2.164,  b_tp:-0.940,  a_qp:2.272,  b_qp:-0.409,  a_TB:5.428, b_TB:0.852, a_W50:2.084, b_W50:-1.065, a_W75:1.028, b_W75:-1.071, a_WR50:0.856, b_WR50:-0.865, a_WR75:0.440, b_WR75:-0.918},\n'
            '  "1b":  {a_tp:0.339,  b_tp:0.826,   a_qp:1.251,  b_qp:-0.610,  a_TB:6.662, b_TB:0.613, a_W50:2.215, b_W50:-1.034, a_W75:1.190, b_W75:-1.057, a_WR50:0.834, b_WR50:-1.077, a_WR75:0.502, b_WR75:-1.065},\n'
            '  "1c":  {a_tp:2.195,  b_tp:-0.944,  a_qp:1.331,  b_qp:-0.492,  a_TB:3.917, b_TB:0.990, a_W50:2.040, b_W50:-1.026, a_W75:1.250, b_W75:-0.864, a_WR50:0.739, b_WR50:-0.968, a_WR75:0.500, b_WR75:-0.813},\n'
            '  "5a":  {a_tp:1.5607, b_tp:-1.0814, a_qp:0.9178, b_qp:-0.4313, a_TB:7.380, b_TB:0.734, a_W50:1.925, b_W50:-1.090, a_W75:1.019, b_W75:-1.044, a_WR50:0.579, b_WR50:-1.107, a_WR75:0.347, b_WR75:-1.054},\n'
            '  "7":   {a_tp:2.498,  b_tp:0.156,   a_qp:1.048,  b_qp:-0.178,  a_TB:7.845, b_TB:0.453, a_W50:1.954, b_W50:0.099,  a_W75:0.972, b_W75:0.124,  a_WR50:0.189, b_WR50:1.769, a_WR75:0.419, b_WR75:1.246}\n'
            "};\n"
            'return table[inputs.sub_zone] || table["3a"];'
        )
        node["data"]["config"]["code"] = new_code

print("Updating node_in_profile...")
for node in data["nodes"]:
    if node["id"] == "node_in_profile":
        fields = node["data"]["config"]["fields"]
        for f in fields:
            if f["key"] == "stream_profile":
                f["default"] = [
                    { "chainage": 0, "rl": 497 },
                    { "chainage": 4.367, "rl": 492 },
                    { "chainage": 11.867, "rl": 468 },
                    { "chainage": 19.367, "rl": 439 },
                    { "chainage": 26.867, "rl": 425 },
                    { "chainage": 34.367, "rl": 404 },
                    { "chainage": 41.867, "rl": 391 },
                    { "chainage": 49.367, "rl": 375 },
                    { "chainage": 56.867, "rl": 365 },
                    { "chainage": 64.367, "rl": 360 },
                    { "chainage": 71.867, "rl": 355 },
                    { "chainage": 79.367, "rl": 348 }
                ]

print("Updating node_f_tp...")
for node in data["nodes"]:
    if node["id"] == "node_f_tp":
        cfg = node["data"]["config"]
        cfg["expression"] = "a_tp * pow(qp, b_tp)"
        cfg["display_expression"] = "tp = a_tp · qp^b_tp"
        cfg["showVars"] = [
            { "key": "a_tp", "unit": "", "label": "tp linear coefficient" },
            { "key": "b_tp", "unit": "", "label": "tp power exponent" },
            { "key": "qp", "unit": "cumec/sqkm", "label": "Peak Unit Discharge qp" }
        ]
        cfg["registry_inputs"] = [
            { "key": "a_tp", "unit": None, "label": "tp linear coefficient" },
            { "key": "b_tp", "unit": None, "label": "tp power exponent" },
            { "key": "qp", "unit": "cumec/sqkm", "label": "Peak Unit Discharge qp" }
        ]
        cfg["variable_bindings"] = {
            "a_tp": "a_tp",
            "b_tp": "b_tp",
            "qp": "qp"
        }

print("Updating edges for node_f_tp...")
# Find edge from node_cc_slope to node_f_tp and change source to node_f_qp
for edge in data["edges"]:
    if edge["target"] == "node_f_tp" and edge["source"] == "node_cc_slope":
        edge["source"] = "node_f_qp"
        print("Updated edge source to node_f_qp!")

print("Updating node_cc_hyeto...")
for node in data["nodes"]:
    if node["id"] == "node_cc_hyeto":
        # Modify critical sequencing to reverse descending sort
        old_code = node["data"]["config"]["code"]
        new_critical_func = (
            "function critical(depth) {\n"
            "  const hourly = incr.map(p => (p/100) * depth);\n"
            "  const excess = hourly.map(r => Math.max(0, r - inputs.loss_rate));\n"
            "  const sorted = [...excess].sort((a, b) => b - a);\n"
            "  return sorted.reverse();\n"
            "}"
        )
        # Find critical function block in old_code and replace
        # We can find `function critical(depth) { ... }`
        import re
        pattern = r"function critical\(depth\)\s*\{[^}]*\}"
        updated_code = re.sub(pattern, new_critical_func, old_code)
        node["data"]["config"]["code"] = updated_code

print("Updating node_cc_uh...")
for node in data["nodes"]:
    if node["id"] == "node_cc_uh":
        # Swap assignments
        old_code = node["data"]["config"]["code"]
        # Replace:
        # { t: Tm - WR75,      q: 0.75*Qp  },
        # { t: Tm - WR50,      q: 0.50*Qp  },
        # with:
        # { t: Tm - WR75,      q: 0.50*Qp  },
        # { t: Tm - WR50,      q: 0.75*Qp  },
        old_block = (
            "  { t: Tm - WR75,      q: 0.75*Qp  },\n"
            "  { t: Tm - WR50,      q: 0.50*Qp  },"
        )
        new_block = (
            "  { t: Tm - WR75,      q: 0.50*Qp  },\n"
            "  { t: Tm - WR50,      q: 0.75*Qp  },"
        )
        if old_block in old_code:
            node["data"]["config"]["code"] = old_code.replace(old_block, new_block)
            print("Swapped WR75 and WR50 in node_cc_uh!")
        else:
            # Try alternate formatting
            old_block_alt = (
                "  { t: Tm - WR75,      q: 0.75*Qp  },\n"
                "  { t: Tm - WR50,      q: 0.5*Qp  },"
            )
            new_block_alt = (
                "  { t: Tm - WR75,      q: 0.5*Qp  },\n"
                "  { t: Tm - WR50,      q: 0.75*Qp  },"
            )
            node["data"]["config"]["code"] = old_code.replace(old_block_alt, new_block_alt)
            print("Swapped alternate formatting WR75 and WR50 in node_cc_uh!")

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("JSON file updated successfully.")
