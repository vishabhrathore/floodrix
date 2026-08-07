import json

def main():
    path = "/home/vishabh/Downloads/betwa_river_suh_pmf_export.json"
    with open(path, "r") as f:
        data = json.load(f)
        
    for node in data["nodes"]:
        if node["type"] == "INPUT":
            print(f"Input Node ID: {node.get('id')}, Type: {node.get('type')}")
            for k, v in node.items():
                if k not in ["id", "type", "position"]:
                    print(f"  {k}: {v}")
                
if __name__ == "__main__":
    main()
