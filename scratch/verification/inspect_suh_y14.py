import openpyxl

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    wb = openpyxl.load_workbook(path, data_only=True)
    print("SUH!Y14 value:", wb["SUH"]["Y14"].value)

if __name__ == "__main__":
    main()
