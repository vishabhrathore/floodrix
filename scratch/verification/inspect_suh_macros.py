import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    try:
        wb = openpyxl.load_workbook(path, keep_vba=True)
        print("Workbook loaded successfully!")
        print("Sheet names:", wb.sheetnames)
        if wb.vba_archive:
            print("VBA Archive is present!")
        else:
            print("No VBA Archive found.")
    except Exception as e:
        print("Error reading workbook:", e)

if __name__ == "__main__":
    main()
