from oletools.olevba import VBA_Parser
import os

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    vbaparser = VBA_Parser(path)
    if vbaparser.detect_vba_macros():
        for name, filename, stream_path, code in vbaparser.extract_macros():
            cleaned_stream = stream_path.replace("/", "_").replace("\\", "_").replace(".", "_")
            out_name = f"scratch/vba_{cleaned_stream}.vb"
            # Ensure the directory exists
            os.makedirs(os.path.dirname(out_name), exist_ok=True)
            with open(out_name, "w", encoding="utf-8") as f:
                f.write(code)
            print(f"Dumped macro {stream_path} to {out_name}")
    else:
        print("No macros found.")

if __name__ == "__main__":
    main()
