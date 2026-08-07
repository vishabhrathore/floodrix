Attribute VB_Name = "Module2"
Sub The24hrs_GenerateCombinations()

    Dim ws As Worksheet
    Dim baseRange1 As Range, baseRange2 As Range
    Dim targetRow As Long, startCol As Long
    Dim i As Long
    Dim lastRow As Long
    Dim baseVal As Double
    Dim col As Long, startRow As Long, bRow As Long
    Dim maxRow As Long
    Dim rowSum As Double
    Dim zeroCount As Long
    
    Set ws = ThisWorkbook.Sheets("24hr SPS") ' <-- change sheet name if needed
    
    ' Step 1: Copy N35:N46 and O35:O46 into Row 52 starting from Column C
    Set baseRange1 = ws.Range("N35:N46")
    Set baseRange2 = ws.Range("O35:O46")
    
    targetRow = 52
    startCol = 3 ' Column C
    
    ' Clear old results but keep AA52 intact
    ws.Range("C52:Z2000").ClearContents
    ws.Range("AA53:AA2000").ClearContents
    
    ' Fill row 52 with base values
    For i = 1 To baseRange1.Rows.count
        ws.Cells(targetRow, startCol + i - 1).Value = baseRange1.Cells(i, 1).Value
    Next i
    
    For i = 1 To baseRange2.Rows.count
        ws.Cells(targetRow, startCol + baseRange1.Rows.count + i - 1).Value = baseRange2.Cells(i, 1).Value
    Next i
    
    ' Step 2: Multiplication logic
    ' Find last used row in column B
    lastRow = ws.Cells(ws.Rows.count, "B").End(xlUp).row
    
    maxRow = 52 ' to track last filled row
    
    For col = startCol To startCol + baseRange1.Rows.count + baseRange2.Rows.count - 1
        baseVal = ws.Cells(targetRow, col).Value
        
        ' Shift starting row based on column offset
        startRow = 53 + (col - startCol)
        
        bRow = 53 ' starting B row
        zeroCount = 0
        
        Do While zeroCount < 2 And bRow <= lastRow
            If ws.Cells(bRow, "B").Value = 0 Then
                zeroCount = zeroCount + 1
                ' Include row with zero ? write 0
                ws.Cells(startRow, col).Value = 0
                If startRow > maxRow Then maxRow = startRow
                startRow = startRow + 1
            Else
                ws.Cells(startRow, col).Value = baseVal * ws.Cells(bRow, "B").Value
                If startRow > maxRow Then maxRow = startRow
                startRow = startRow + 1
            End If
            bRow = bRow + 1
        Loop
    Next col
    
    ' Step 3: Add static summation in AA column (rows 53 and below only)
    For i = 53 To maxRow
        rowSum = Application.WorksheetFunction.Sum(ws.Range("C" & i & ":Z" & i))
        ws.Cells(i, "AA").Value = rowSum
    Next i
    
    MsgBox "Combinations and static totals (including 2nd zero row) generated successfully!", vbInformation

End Sub

