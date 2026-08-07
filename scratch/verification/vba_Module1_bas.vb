Attribute VB_Name = "Module1"
Option Explicit

Sub The48hrs_OptimizeBlockOrder_Final()
    Const SHEET_NAME As String = "48hr SPS "   ' <-- adjust if needed (note trailing space)
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(SHEET_NAME)
    On Error GoTo 0
    If ws Is Nothing Then
        MsgBox "Worksheet '" & SHEET_NAME & "' not found. Adjust SHEET_NAME.", vbCritical
        Exit Sub
    End If

    ' -------- Load the 4 blocks (R35:U46) into memory as Doubles --------
    Dim blocks(1 To 4, 1 To 12) As Double
    Dim i As Long
    For i = 1 To 12
        blocks(1, i) = SafeNumber(ws.Cells(34 + i, 18).Value) ' R (col 18): rows 35..46
        blocks(2, i) = SafeNumber(ws.Cells(34 + i, 19).Value) ' S (col 19)
        blocks(3, i) = SafeNumber(ws.Cells(34 + i, 20).Value) ' T (col 20)
        blocks(4, i) = SafeNumber(ws.Cells(34 + i, 21).Value) ' U (col 21)
    Next i

    ' -------- Prepare permutations of {1,2,3,4} (0-based array) --------
    Dim base As Variant: base = Array(1, 2, 3, 4)
    Dim perms As Collection: Set perms = New Collection
    GeneratePerms base, 0, perms

    ' -------- Clear areas --------
    ws.Range("C52:AX52").ClearContents
    ws.Range("C53:AX169, AY53:AY169").ClearContents
    ws.Range("AY53:AY169").Interior.ColorIndex = xlNone

    ws.Range("BC52:BF200").ClearContents
    ws.Range("BC52:BF52").Value = Array("Seq#", "Block Order", "Max AY", "Row")
    ws.Range("BC52:BF52").Font.Bold = True

    ' -------- Evaluate all permutations (trace only) --------
    Dim bestVal As Double: bestVal = -1E+300
    Dim bestRow As Long: bestRow = 0
    Dim bestOrder As Variant   ' <-- Variant, not typed array
    Dim seq As Long: seq = 0
    Dim traceRow As Long: traceRow = 53

    Dim p As Variant
    For Each p In perms
        seq = seq + 1

        ' Put this permutation's 48 numbers into C52:AX52
        WriteRow52FromBlocks ws, p, blocks

        ' Staggered multiplication (stop at 2nd zero in B)
        FillStaggeredFromRow52 ws, 53, 169

        ' AY sums for this permutation
        Dim r As Long
        For r = 53 To 169
            ws.Cells(r, "AY").Value = Application.Sum(ws.Range(ws.Cells(r, "C"), ws.Cells(r, "AX")))
        Next r

        ' Max AY and row
        Dim localMax As Double, localRow As Long
        localMax = Application.Max(ws.Range("AY53:AY169"))
        localRow = Application.Match(localMax, ws.Range("AY53:AY169"), 0) + 52

        ' Trace table
        ws.Cells(traceRow, "BC").Value = seq
        ws.Cells(traceRow, "BD").Value = FormatOrder(p, "-")
        ws.Cells(traceRow, "BE").Value = localMax
        ws.Cells(traceRow, "BF").Value = "AY" & localRow
        traceRow = traceRow + 1

        ' Track best
        If localMax > bestVal Then
            bestVal = localMax
            bestRow = localRow
            bestOrder = p       ' store this Variant array
        End If
    Next p

    ' -------- Re-run only the BEST permutation so AY reflects BEST --------
    ws.Range("C53:AX169, AY53:AY169").ClearContents

    If IsEmpty(bestOrder) Then
        MsgBox "No valid permutation found.", vbExclamation
        Exit Sub
    End If

    WriteRow52FromBlocks ws, bestOrder, blocks
    FillStaggeredFromRow52 ws, 53, 169

    Dim rr As Long
    For rr = 53 To 169
        ws.Cells(rr, "AY").Value = Application.Sum(ws.Range(ws.Cells(rr, "C"), ws.Cells(rr, "AX")))
    Next rr

    ' Highlight best AY row
    ws.Range("AY53:AY169").Interior.ColorIndex = xlNone
    ws.Cells(bestRow, "AY").Interior.Color = vbGreen

    ' Highlight best permutation row in Trace Table
    Dim f As Range
    Set f = ws.Range("BE53:BE" & traceRow - 1).Find(What:=bestVal, LookAt:=xlWhole, LookIn:=xlValues)
    If Not f Is Nothing Then
        ws.Range(ws.Cells(f.row, "BC"), ws.Cells(f.row, "BF")).Interior.Color = vbGreen
        ws.Range(ws.Cells(f.row, "BC"), ws.Cells(f.row, "BF")).Font.Bold = True
    End If

    ' Reporting
    ws.Range("G49").Value = "Best order:"
    ws.Range("G50").Value = FormatOrder(bestOrder, ", ")
    ws.Range("G51").Value = "Max AY = " & bestVal & " (at AY" & bestRow & ")"

    MsgBox "Best order: " & FormatOrder(bestOrder, ", ") & vbCrLf & _
           "Max AY = " & bestVal & " (at AY" & bestRow & ")", vbInformation
End Sub

' ---------- Build C52:AX52 from a permutation of blocks ----------
Private Sub WriteRow52FromBlocks(ws As Worksheet, order As Variant, blocks As Variant)
    ' order is a 0-based array containing some ordering of {1,2,3,4}
    Dim col As Long, i As Long, blockIdx As Long, pos As Long
    col = 3 ' column C
    For pos = LBound(order) To UBound(order)
        blockIdx = order(pos) ' 1..4
        For i = 1 To 12
            ws.Cells(52, col).Value = blocks(blockIdx, i) ' numeric
            col = col + 1
        Next i
    Next pos
End Sub

' ---------- Staggered multiplication from row 52; stop at 2nd zero in B ----------
Private Sub FillStaggeredFromRow52(ws As Worksheet, startRow As Long, endRow As Long)
    Dim col As Long, r As Long, offset As Long
    Dim zeroCount As Long
    Dim mVal As Variant, mNum As Double, baseVal As Double

    ws.Range(ws.Cells(startRow, "C"), ws.Cells(endRow, "AX")).ClearContents

    For col = 3 To 50 ' C..AX
        offset = col - 3
        baseVal = SafeNumber(ws.Cells(52, col).Value)
        zeroCount = 0

        ' Write starting at (53 + offset)
        For r = startRow + offset To endRow
            ' Column B row = r - offset (starts at 53)
            mVal = ws.Cells(r - offset, "B").Value

            ' Count only true numeric zeros towards the "2nd zero"
            If IsNumeric(mVal) Then
                If CDbl(mVal) = 0# Then
                    zeroCount = zeroCount + 1
                    If zeroCount = 2 Then Exit For
                End If
                mNum = CDbl(mVal)
            Else
                ' Non-numeric / blank multiplier multiplies as 0 but doesn't count toward zero tally
                mNum = 0#
            End If

            ws.Cells(r, col).Value = baseVal * mNum
        Next r
    Next col
End Sub

' ---------- Generate permutations of a 0-based array ----------
Private Sub GeneratePerms(arr As Variant, l As Long, ByRef out As Collection)
    Dim i As Long, tmp As Variant, copyArr As Variant
    If l = UBound(arr) Then
        copyArr = arr        ' clone the current ordering
        out.Add copyArr
    Else
        For i = l To UBound(arr)
            tmp = arr(l): arr(l) = arr(i): arr(i) = tmp
            GeneratePerms arr, l + 1, out
            tmp = arr(l): arr(l) = arr(i): arr(i) = tmp
        Next i
    End If
End Sub

' ---------- Format permutation like "B1-B3-B4-B2" ----------
Private Function FormatOrder(order As Variant, delim As String) As String
    Dim s As String, i As Long
    For i = LBound(order) To UBound(order)
        s = s & "B" & CStr(order(i)) & delim
    Next i
    If Len(s) >= Len(delim) Then s = Left$(s, Len(s) - Len(delim))
    FormatOrder = s
End Function

' ---------- Safely coerce any cell value to Double (blank/error -> 0) ----------
Private Function SafeNumber(v As Variant) As Double
    If IsError(v) Then
        SafeNumber = 0#
    ElseIf IsNumeric(v) Then
        SafeNumber = CDbl(v)
    Else
        SafeNumber = 0#
    End If
End Function


