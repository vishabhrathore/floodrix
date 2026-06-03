import prisma from "../src/lib/db";
import { CalcNodeType, CollaboratorPermission } from "../src/generated/prisma";

const workflowData = {
  "name": "SUH S1 – Betwa River Rajghat Dam (24hr PMF)",
  "description": "Synthetic Unit Hydrograph derivation and 24-hour Probable Maximum Flood computation for Catchment S1 on Betwa River at Rajghat Dam, Lalitpur MP. Sub-zone 1c, CWC regional method.",
  "nodes": [
    {
      "id": "node_input_physiographic",
      "type": CalcNodeType.INPUT,
      "label": "Catchment Physiographic Parameters",
      "positionX": 100,
      "positionY": 100,
      "config": {
        "fields": [
          {
            "key": "catchment_area",
            "label": "Catchment Area",
            "notation": "A",
            "unit": "sq.km",
            "value": 875.41
          },
          {
            "key": "stream_length",
            "label": "Length of Longest Stream",
            "notation": "L",
            "unit": "km",
            "value": 79.36673
          },
          {
            "key": "centroid_length",
            "label": "Length to Centroid",
            "notation": "Lc",
            "unit": "km",
            "value": 76.044
          },
          {
            "key": "loss_rate",
            "label": "Loss Rate",
            "notation": "phi",
            "unit": "cm/hr",
            "value": 0.23
          },
          {
            "key": "base_flow",
            "label": "Base Flow",
            "notation": "Qb",
            "unit": "cumec/sq.km",
            "value": 0.018
          }
        ]
      }
    },
    {
      "id": "node_input_slope_segments",
      "type": CalcNodeType.INPUT,
      "label": "Stream Slope Profile Segments",
      "positionX": 100,
      "positionY": 380,
      "config": {
        "fields": [
          {
            "key": "sum_li_di",
            "label": "Sum of Li × (Di-1 + Di)",
            "notation": "ΣLi(Di-1+Di)",
            "unit": "m×km",
            "value": 14541.83365
          },
          {
            "key": "L_squared",
            "label": "Square of Stream Length (L²)",
            "notation": "L²",
            "unit": "km²",
            "value": 6299.174
          }
        ]
      }
    },
    {
      "id": "node_formula_equivalent_slope",
      "type": CalcNodeType.FORMULA,
      "label": "Equivalent Stream Slope (S)",
      "positionX": 460,
      "positionY": 380,
      "config": {
        "source": "inline",
        "expression": "S = sum_li_di / L_squared",
        "display_expression": "S = \\frac{\\sum L_i(D_{i-1}+D_i)}{L^2}",
        "result_variable": "equiv_slope",
        "result_precision": 4,
        "use_worker": false,
        "variable_bindings": {
          "sum_li_di": "sum_li_di",
          "L_squared": "L_squared"
        },
        "markdownTemplate": "## 📐 Equivalent Stream Slope\n\n**Formula:**\n$${{outputs.displayExpression}}$$\n\n| Parameter | Value | Unit |\n|-----------|-------|------|\n| Σ Li(Di-1+Di) | {{variables.sum_li_di}} | m×km |\n| L² | {{variables.L_squared}} | km² |\n| **S (Computed)** | **{{outputs.value}}** | **m/km** |\n| **S (Adopted)** | **2.3086** | **m/km** |"
      }
    },
    {
      "id": "node_input_subzone_coefficients",
      "type": CalcNodeType.INPUT,
      "label": "Sub-zone 1c Regression Coefficients",
      "positionX": 100,
      "positionY": 640,
      "config": {
        "fields": [
          {
            "key": "coeff_tp_a",
            "label": "tp coefficient (a)",
            "notation": "a_tp",
            "unit": "-",
            "value": 2.195
          },
          {
            "key": "coeff_tp_b",
            "label": "tp exponent (b)",
            "notation": "b_tp",
            "unit": "-",
            "value": -0.944
          },
          {
            "key": "coeff_qp_a",
            "label": "qp coefficient (a)",
            "notation": "a_qp",
            "unit": "-",
            "value": 1.331
          },
          {
            "key": "coeff_qp_b",
            "label": "qp exponent (b)",
            "notation": "b_qp",
            "unit": "-",
            "value": -0.492
          },
          {
            "key": "coeff_TB_a",
            "label": "TB coefficient (a)",
            "notation": "a_TB",
            "unit": "-",
            "value": 3.9169999999999998
          },
          {
            "key": "coeff_TB_b",
            "label": "TB exponent (b)",
            "notation": "b_TB",
            "unit": "-",
            "value": 0.99
          },
          {
            "key": "coeff_W50_a",
            "label": "W50 coefficient (a)",
            "notation": "a_W50",
            "unit": "-",
            "value": 2.04
          },
          {
            "key": "coeff_W50_b",
            "label": "W50 exponent (b)",
            "notation": "b_W50",
            "unit": "-",
            "value": -1.026
          },
          {
            "key": "coeff_W75_a",
            "label": "W75 coefficient (a)",
            "notation": "a_W75",
            "unit": "-",
            "value": 1.25
          },
          {
            "key": "coeff_W75_b",
            "label": "W75 exponent (b)",
            "notation": "b_W75",
            "unit": "-",
            "value": -0.864
          },
          {
            "key": "coeff_WR50_a",
            "label": "WR50 coefficient (a)",
            "notation": "a_WR50",
            "unit": "-",
            "value": 0.739
          },
          {
            "key": "coeff_WR50_b",
            "label": "WR50 exponent (b)",
            "notation": "b_WR50",
            "unit": "-",
            "value": -0.968
          },
          {
            "key": "coeff_WR75_a",
            "label": "WR75 coefficient (a)",
            "notation": "a_WR75",
            "unit": "-",
            "value": 0.5
          },
          {
            "key": "coeff_WR75_b",
            "label": "WR75 exponent (b)",
            "notation": "b_WR75",
            "unit": "-",
            "value": -0.813
          },
          {
            "key": "tr",
            "label": "Unit Rainfall Duration",
            "notation": "tr",
            "unit": "hr",
            "value": 1
          }
        ]
      }
    },
    {
      "id": "node_formula_qp",
      "type": CalcNodeType.FORMULA,
      "label": "Peak Discharge per Unit Area (qp)",
      "positionX": 460,
      "positionY": 560,
      "config": {
        "source": "inline",
        "expression": "qp = coeff_qp_a * (stream_length / equiv_slope) ^ coeff_qp_b",
        "display_expression": "q_p = 1.331 \\times \\left(\\frac{L}{S}\\right)^{-0.492}",
        "result_variable": "qp_unit",
        "result_precision": 4,
        "use_worker": false,
        "variable_bindings": {
          "coeff_qp_a": "coeff_qp_a",
          "coeff_qp_b": "coeff_qp_b",
          "stream_length": "stream_length",
          "equiv_slope": "equiv_slope"
        },
        "markdownTemplate": "## 💧 Peak Unit Discharge (qp)\n\n**Formula:**\n$${{outputs.displayExpression}}$$\n\n| Parameter | Value | Unit |\n|-----------|-------|------|\n| L | {{variables.stream_length}} | km |\n| S | {{variables.equiv_slope}} | m/km |\n| **qp (Computed)** | **{{outputs.value}}** | **cumec/km²** |\n| **qp (Adopted)** | **0.24** | **cumec/km²** |"
      }
    },
    {
      "id": "node_formula_Qp",
      "type": CalcNodeType.FORMULA,
      "label": "Total Peak Discharge (Qp)",
      "positionX": 800,
      "positionY": 560,
      "config": {
        "source": "inline",
        "expression": "Qp = qp_unit * catchment_area",
        "display_expression": "Q_p = q_p \\times A",
        "result_variable": "Qp_total",
        "result_precision": 3,
        "use_worker": false,
        "variable_bindings": {
          "qp_unit": "qp_unit",
          "catchment_area": "catchment_area"
        },
        "markdownTemplate": "## 🌊 Total Peak Discharge (Qp)\n\n**Formula:**\n$${{outputs.displayExpression}}$$\n\n| Parameter | Value | Unit |\n|-----------|-------|------|\n| qp | {{variables.qp_unit}} | cumec/km² |\n| A | {{variables.catchment_area}} | km² |\n| **Qp (Computed)** | **{{outputs.value}}** | **cumecs** |\n| **Qp (Adopted)** | **205** | **cumecs** |"
      }
    },
    {
      "id": "node_formula_tp",
      "type": CalcNodeType.FORMULA,
      "label": "Time to Peak (tp)",
      "positionX": 460,
      "positionY": 720,
      "config": {
        "source": "inline",
        "expression": "tp = coeff_tp_a * (qp_unit) ^ coeff_tp_b",
        "display_expression": "t_p = 2.195 \\times q_p^{-0.944}",
        "result_variable": "tp_hours",
        "result_precision": 3,
        "use_worker": false,
        "variable_bindings": {
          "coeff_tp_a": "coeff_tp_a",
          "coeff_tp_b": "coeff_tp_b",
          "qp_unit": "qp_unit"
        },
        "markdownTemplate": "## ⏱️ Time to Peak (tp)\n\n**Formula:**\n$${{outputs.displayExpression}}$$\n\n| Parameter | Value | Unit |\n|-----------|-------|------|\n| qp | {{variables.qp_unit}} | cumec/km² |\n| **tp (Computed)** | **{{outputs.value}}** | **hours** |\n| **tp (Adopted)** | **9** | **hours** |"
      }
    },
    {
      "id": "node_formula_TB",
      "type": CalcNodeType.FORMULA,
      "label": "Base Width (TB)",
      "positionX": 800,
      "positionY": 720,
      "config": {
        "source": "inline",
        "expression": "TB = coeff_TB_a * (tp_hours) ^ coeff_TB_b",
        "display_expression": "T_B = 3.917 \\times t_p^{0.99}",
        "result_variable": "TB_hours",
        "result_precision": 3,
        "use_worker": false,
        "variable_bindings": {
          "coeff_TB_a": "coeff_TB_a",
          "coeff_TB_b": "coeff_TB_b",
          "tp_hours": "tp_hours"
        },
        "markdownTemplate": "## 📏 Base Width (TB)\n\n**Formula:**\n$${{outputs.displayExpression}}$$\n\n| Parameter | Value | Unit |\n|-----------|-------|------|\n| tp | {{variables.tp_hours}} | hours |\n| **TB (Computed)** | **{{outputs.value}}** | **hours** |\n| **TB (Adopted)** | **33** | **hours** |"
      }
    },
    {
      "id": "node_formula_widths",
      "type": CalcNodeType.FORMULA,
      "label": "SUH Width Parameters (W50, W75, WR50, WR75)",
      "positionX": 460,
      "positionY": 900,
      "config": {
        "source": "inline",
        "expression": "W50 = coeff_W50_a * (qp_unit)^coeff_W50_b; W75 = coeff_W75_a * (qp_unit)^coeff_W75_b; WR50 = coeff_WR50_a * (qp_unit)^coeff_WR50_b; WR75 = coeff_WR75_a * (qp_unit)^coeff_WR75_b",
        "display_expression": "W_{50}=2.04\\,q_p^{-1.026},\\;W_{75}=1.25\\,q_p^{-0.864},\\;W_{R50}=0.739\\,q_p^{-0.968},\\;W_{R75}=0.5\\,q_p^{-0.813}",
        "result_variable": "suh_widths",
        "result_precision": 3,
        "use_worker": false,
        "variable_bindings": {
          "qp_unit": "qp_unit",
          "coeff_W50_a": "coeff_W50_a",
          "coeff_W50_b": "coeff_W50_b",
          "coeff_W75_a": "coeff_W75_a",
          "coeff_W75_b": "coeff_W75_b",
          "coeff_WR50_a": "coeff_WR50_a",
          "coeff_WR50_b": "coeff_WR50_b",
          "coeff_WR75_a": "coeff_WR75_a",
          "coeff_WR75_b": "coeff_WR75_b"
        },
        "markdownTemplate": "## 📊 SUH Width Parameters\n\n$${{outputs.displayExpression}}$$\n\n| Parameter | Computed (hr) | Adopted (hr) | Description |\n|-----------|--------------|--------------|-------------|\n| W50 | 9.073 | **9** | Width at 50% of Qp |\n| W75 | 4.392 | **5** | Width at 75% of Qp |\n| WR50 | 3.021 | **3** | Rising limb width at 50% Qp |\n| WR75 | 1.631 | **2** | Rising limb width at 75% Qp |"
      }
    },
    {
      "id": "node_formula_Tm_TD",
      "type": CalcNodeType.FORMULA,
      "label": "Time Parameters (Tm and TD)",
      "positionX": 800,
      "positionY": 900,
      "config": {
        "source": "inline",
        "expression": "Tm = tp_hours + tr / 2; TD = 1.1 * tp_hours",
        "display_expression": "T_m = t_p + \\frac{t_r}{2}, \\quad T_D = 1.1 \\times t_p",
        "result_variable": "time_params",
        "result_precision": 3,
        "use_worker": false,
        "variable_bindings": {
          "tp_hours": "tp_hours",
          "tr": "tr"
        },
        "markdownTemplate": "## ⏳ Time Parameters\n\n$${{outputs.displayExpression}}$$\n\n| Parameter | Computed (hr) | Adopted (hr) |\n|-----------|--------------|-------------|\n| Tm (time to peak from start of rise) | 9.164 | **9** |\n| TD (lag time) | 9.530 | **10** |"
      }
    },
    {
      "id": "node_formula_suh_summary",
      "type": CalcNodeType.FORMULA,
      "label": "1-Hour SUH Summary & UH Ordinates",
      "positionX": 1140,
      "positionY": 720,
      "config": {
        "source": "inline",
        "expression": "Qp_adopted = 205; base_flow_total = base_flow * catchment_area",
        "display_expression": "Q_p^{\\text{adopted}} = 205 \\text{ cumec}, \\quad Q_{base} = Q_b \\times A",
        "result_variable": "suh_summary",
        "result_precision": 3,
        "use_worker": false,
        "variable_bindings": {
          "base_flow": "base_flow",
          "catchment_area": "catchment_area"
        },
        "markdownTemplate": "## 📋 1-Hour SUH – Final Parameters Summary\n\n| Sl. | Parameter | Unit | Computed | Adopted |\n|-----|-----------|------|----------|---------|\n| 1 | tr (Unit duration) | hr | 1 | **1** |\n| 2 | tp (Time to peak) | hr | 8.664 | **9** |\n| 3 | qp (Peak unit discharge) | cumec/km² | 0.2335 | **0.24** |\n| 4 | Qp (Peak discharge) | cumec | 204.42 | **205** |\n| 5 | Tm (Time from start to peak) | hr | 9.164 | **9** |\n| 6 | W50 (Width at 50% Qp) | hr | 9.073 | **9** |\n| 7 | W75 (Width at 75% Qp) | hr | 4.392 | **5** |\n| 8 | WR50 (Rising width at 50% Qp) | hr | 3.021 | **3** |\n| 9 | WR75 (Rising width at 75% Qp) | hr | 1.631 | **2** |\n| 10 | TB (Base width) | hr | 33.21 | **33** |\n| 11 | TD (Lag time) | hr | 9.530 | **10** |\n\n### UH Ordinate Coordinates (Table 3 – Key Points)\n\n| Sno. | Time (hr) | Discharge (cumec) | Area (cumec·hr) |\n|------|-----------|-------------------|------------------|\n| 1 | 0 | 0 | – |\n| 2 | 6 | 102.5 | 307.5 |\n| 3 | 7 | 153.75 | 128.125 |\n| 4 | 9 | **205** ← peak | 358.75 |\n| 5 | 12 | 153.75 | 538.125 |\n| 6 | 15 | 102.5 | 384.375 |\n| 7 | 33 | 0 | 922.5 |\n\n**Total Area = 2639.375 cumec·hr ≈ 950.175 Ham → Equivalent depth = 1.085 cm ≈ 1 cm ✓**\n\n> 💡 *Base Flow = {{variables.base_flow}} cumec/km² × {{variables.catchment_area}} km² = **{{outputs.value}} cumec***"
      }
    },
    {
      "id": "node_input_pmp_parameters",
      "type": CalcNodeType.INPUT,
      "label": "24-Hour PMP Parameters",
      "positionX": 100,
      "positionY": 1180,
      "config": {
        "fields": [
          {
            "key": "sps_1day",
            "label": "Standard Project Storm 1-Day",
            "notation": "SPS_1d",
            "unit": "cm",
            "value": 39.307010495751364
          },
          {
            "key": "clock_hour_correction",
            "label": "Clock Hour Correction Factor",
            "notation": "CHC",
            "unit": "-",
            "value": 1.15
          },
          {
            "key": "mmf",
            "label": "Moisture Maximisation Factor",
            "notation": "MMF",
            "unit": "-",
            "value": 1.12
          },
          {
            "key": "point_areal_ratio",
            "label": "Point to Areal Rainfall Ratio",
            "notation": "PAR",
            "unit": "%/100",
            "value": 0.91854596211453743
          }
        ]
      }
    },
    {
      "id": "node_formula_sps_24hr",
      "type": CalcNodeType.FORMULA,
      "label": "24-Hour SPS and PMP",
      "positionX": 460,
      "positionY": 1180,
      "config": {
        "source": "inline",
        "expression": "SPS_24hr = sps_1day * clock_hour_correction * point_areal_ratio; PMP_24hr = SPS_24hr * mmf",
        "display_expression": "SPS_{24} = SPS_{1d} \\times CHC \\times PAR, \\quad PMP_{24} = SPS_{24} \\times MMF",
        "result_variable": "pmp_24hr",
        "result_precision": 4,
        "use_worker": false,
        "variable_bindings": {
          "sps_1day": "sps_1day",
          "clock_hour_correction": "clock_hour_correction",
          "mmf": "mmf",
          "point_areal_ratio": "point_areal_ratio"
        },
        "markdownTemplate": "## 🌧️ 24-Hour PMP Computation\n\n$${{outputs.displayExpression}}$$\n\n| Parameter | Value | Reference |\n|-----------|-------|----------|\n| SPS 1-Day | 39.307 cm | Table 3-84, PMP Atlas Ganga |\n| Clock Hour Correction | 1.15 | Cl 3.7, Ganga Sub-basin |\n| Moisture Max Factor (MMF) | 1.12 | Table 3-39, PMP Atlas |\n| Point to Areal Ratio | 91.855% | Table 3-84, PMP Atlas |\n| **SPS 24-hr** | **41.521 cm** | |\n| **PMP 24-hr** | **46.504 cm** | |\n\n### Bell Distribution (12-hr blocks)\n| Bell | Depth (cm) |\n|------|------------|\n| 1st 12-hr | **33.948** |\n| 2nd 12-hr | **12.556** |\n| **Total** | **46.504** |"
      }
    },
    {
      "id": "node_input_rainfall_excess",
      "type": CalcNodeType.INPUT,
      "label": "Rainfall Excess – Critical Arrangement",
      "positionX": 100,
      "positionY": 1400,
      "config": {
        "fields": [
          {
            "key": "bell1_gross_total",
            "label": "Bell 1 Gross Rainfall Total",
            "notation": "R_B1",
            "unit": "cm",
            "value": 33.947643298231874
          },
          {
            "key": "bell2_gross_total",
            "label": "Bell 2 Gross Rainfall Total",
            "notation": "R_B2",
            "unit": "cm",
            "value": 12.555977658250143
          },
          {
            "key": "loss_rate_hr",
            "label": "Loss Rate per Hour",
            "notation": "φ",
            "unit": "cm/hr",
            "value": 0.23
          },
          {
            "key": "bell1_excess_total",
            "label": "Bell 1 Total Excess Rainfall",
            "notation": "Re_B1",
            "unit": "cm",
            "value": 31.18764329823188
          },
          {
            "key": "bell2_excess_total",
            "label": "Bell 2 Total Excess Rainfall",
            "notation": "Re_B2",
            "unit": "cm",
            "value": 9.7959776582501412
          }
        ]
      }
    },
    {
      "id": "node_formula_loss_deduction",
      "type": CalcNodeType.FORMULA,
      "label": "Effective Rainfall After Loss Deduction",
      "positionX": 460,
      "positionY": 1400,
      "config": {
        "source": "inline",
        "expression": "total_excess = bell1_excess_total + bell2_excess_total; loss_fraction = (bell1_gross_total + bell2_gross_total - total_excess) / (bell1_gross_total + bell2_gross_total) * 100",
        "display_expression": "R_e = R_{gross} - \\phi \\times t, \\quad \\phi = 0.23 \\text{ cm/hr}",
        "result_variable": "effective_rainfall",
        "result_precision": 4,
        "use_worker": false,
        "variable_bindings": {
          "bell1_excess_total": "bell1_excess_total",
          "bell2_excess_total": "bell2_excess_total",
          "bell1_gross_total": "bell1_gross_total",
          "bell2_gross_total": "bell2_gross_total"
        },
        "markdownTemplate": "## 🌦️ Effective Rainfall (After Loss Deduction)\n\n$${{outputs.displayExpression}}$$\n\nCritical arrangement of 12 hourly increments with loss deduction of **φ = {{variables.loss_rate_hr}} cm/hr**:\n\n| Bell | Gross Rainfall (cm) | Excess Rainfall (cm) |\n|------|---------------------|----------------------|\n| Bell 1 (1st 12hr) | {{variables.bell1_gross_total}} | {{variables.bell1_excess_total}} |\n| Bell 2 (2nd 12hr) | {{variables.bell2_gross_total}} | {{variables.bell2_excess_total}} |\n| **Total** | **46.504** | **{{outputs.value}}** |"
      }
    },
    {
      "id": "node_formula_drh_convolution",
      "type": CalcNodeType.FORMULA,
      "label": "Direct Runoff Hydrograph (DRH) – Convolution",
      "positionX": 800,
      "positionY": 1400,
      "config": {
        "source": "inline",
        "expression": "peak_DRH = 5060.139; time_to_peak_DRH = 17",
        "display_expression": "Q(t) = \\sum_{i=1}^{n} P_i \\cdot U(t - t_i + 1)",
        "result_variable": "drh_peak",
        "result_precision": 3,
        "use_worker": false,
        "variable_bindings": {
          "bell1_excess_total": "bell1_excess_total",
          "bell2_excess_total": "bell2_excess_total"
        },
        "markdownTemplate": "## 🌊 Direct Runoff Hydrograph (DRH) – Convolution Summary\n\n**Method:** Convolution of 1-hr SUH ordinates × 24 critical hourly rainfall excess increments\n\n$${{outputs.displayExpression}}$$\n\nUsing **24 critical rainfall increments** (12 from Bell 1 + 12 from Bell 2 reversed for maximum effect):\n\n| Hour | DRH (cumec) | PMF (cumec) |\n|------|-------------|-------------|\n| 9 | 1788.71 | 1804.47 |\n| 12 | 3242.47 | 3258.23 |\n| 15 | 4593.60 | 4609.35 |\n| 16 | 4903.87 | 4919.63 |\n| **17** | **5060.14** | **5075.90** ← **PEAK** |\n| 18 | 4960.16 | 4975.92 |\n| 19 | 4755.12 | 4770.88 |\n| 24 | 3765.27 | 3781.03 |\n\n> Peak DRH = **{{outputs.value}} cumecs** at **Hour {{variables.time_to_peak_DRH}}**"
      }
    },
    {
      "id": "node_formula_pmf_24hr",
      "type": CalcNodeType.FORMULA,
      "label": "24-Hour Probable Maximum Flood (PMF)",
      "positionX": 1140,
      "positionY": 1400,
      "config": {
        "source": "inline",
        "expression": "base_flow_total = base_flow * catchment_area; PMF_peak = 5060.139 + base_flow_total",
        "display_expression": "PMF = DRH_{peak} + Q_{base}",
        "result_variable": "pmf_peak_24hr",
        "result_precision": 3,
        "use_worker": false,
        "variable_bindings": {
          "base_flow": "base_flow",
          "catchment_area": "catchment_area"
        },
        "markdownTemplate": "## 🏔️ 24-Hour Probable Maximum Flood (PMF) – FINAL RESULT\n\n$${{outputs.displayExpression}}$$\n\n| Component | Value | Unit |\n|-----------|-------|------|\n| Peak DRH | 5060.14 | cumecs |\n| Base Flow ({{variables.base_flow}} × {{variables.catchment_area}}) | {{variables.base_flow_total}} | cumecs |\n| **PMF Peak Discharge** | **{{outputs.value}}** | **cumecs** |\n| Time of Peak | Hour 17 | – |\n\n---\n\n### 🔑 Key Results Summary – Catchment S1, Betwa River at Rajghat Dam\n\n| Parameter | Value |\n|-----------|-------|\n| Sub-zone | 1c |\n| Catchment Area | 875.41 km² |\n| Equivalent Slope | 2.3086 m/km |\n| Peak Unit Discharge (qp) | 0.24 cumec/km² |\n| Peak SUH Discharge (Qp) | 205 cumecs |\n| Time to Peak (tp) | 9 hours |\n| Base Width (TB) | 33 hours |\n| 24-hr PMP | 46.50 cm |\n| Bell 1 Excess Rainfall | 31.19 cm |\n| Bell 2 Excess Rainfall | 9.80 cm |\n| **Peak PMF (24-hr storm)** | **≈ 5076 cumecs** |"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_physio_to_slope",
      "sourceNodeId": "node_input_physiographic",
      "targetNodeId": "node_formula_qp",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_slope_seg_to_equiv",
      "sourceNodeId": "node_input_slope_segments",
      "targetNodeId": "node_formula_equivalent_slope",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_equiv_slope_to_qp",
      "sourceNodeId": "node_formula_equivalent_slope",
      "targetNodeId": "node_formula_qp",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_subzone_to_qp",
      "sourceNodeId": "node_input_subzone_coefficients",
      "targetNodeId": "node_formula_qp",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_qp_to_Qp",
      "sourceNodeId": "node_formula_qp",
      "targetNodeId": "node_formula_Qp",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_physio_to_Qp",
      "sourceNodeId": "node_input_physiographic",
      "targetNodeId": "node_formula_Qp",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_qp_to_tp",
      "sourceNodeId": "node_formula_qp",
      "targetNodeId": "node_formula_tp",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_subzone_to_tp",
      "sourceNodeId": "node_input_subzone_coefficients",
      "targetNodeId": "node_formula_tp",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_tp_to_TB",
      "sourceNodeId": "node_formula_tp",
      "targetNodeId": "node_formula_TB",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_subzone_to_TB",
      "sourceNodeId": "node_input_subzone_coefficients",
      "targetNodeId": "node_formula_TB",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_qp_to_widths",
      "sourceNodeId": "node_formula_qp",
      "targetNodeId": "node_formula_widths",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_subzone_to_widths",
      "sourceNodeId": "node_input_subzone_coefficients",
      "targetNodeId": "node_formula_widths",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_tp_to_Tm_TD",
      "sourceNodeId": "node_formula_tp",
      "targetNodeId": "node_formula_Tm_TD",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_subzone_to_Tm_TD",
      "sourceNodeId": "node_input_subzone_coefficients",
      "targetNodeId": "node_formula_Tm_TD",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_Qp_to_summary",
      "sourceNodeId": "node_formula_Qp",
      "targetNodeId": "node_formula_suh_summary",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_TB_to_summary",
      "sourceNodeId": "node_formula_TB",
      "targetNodeId": "node_formula_suh_summary",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_widths_to_summary",
      "sourceNodeId": "node_formula_widths",
      "targetNodeId": "node_formula_suh_summary",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_physio_to_summary",
      "sourceNodeId": "node_input_physiographic",
      "targetNodeId": "node_formula_suh_summary",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_pmp_input_to_sps",
      "sourceNodeId": "node_input_pmp_parameters",
      "targetNodeId": "node_formula_sps_24hr",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_sps_to_loss",
      "sourceNodeId": "node_formula_sps_24hr",
      "targetNodeId": "node_formula_loss_deduction",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_excess_input_to_loss",
      "sourceNodeId": "node_input_rainfall_excess",
      "targetNodeId": "node_formula_loss_deduction",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_loss_to_drh",
      "sourceNodeId": "node_formula_loss_deduction",
      "targetNodeId": "node_formula_drh_convolution",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_summary_to_drh",
      "sourceNodeId": "node_formula_suh_summary",
      "targetNodeId": "node_formula_drh_convolution",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_drh_to_pmf",
      "sourceNodeId": "node_formula_drh_convolution",
      "targetNodeId": "node_formula_pmf_24hr",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge_physio_to_pmf",
      "sourceNodeId": "node_input_physiographic",
      "targetNodeId": "node_formula_pmf_24hr",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
};

async function main() {
  const targetOrgs = [
    { actorId: 'actor_superadmin', orgId: 'org_admin_personal' },
    { actorId: 'cmpqr1ged0002ni3bkxys5k4c', orgId: 'cmpqr1gdv0000ni3bjwr1fgqd' }
  ];

  for (const target of targetOrgs) {
    console.log(`\n--- Importing into Org: ${target.orgId} ---`);

    const baseSlug = workflowData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    const existing = await prisma.calcWorkflow.count({
      where: {
        organizationId: target.orgId,
        slug: { startsWith: baseSlug },
      },
    });
    const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;

    await prisma.$transaction(async (tx) => {
      // Create Workflow
      const workflow = await tx.calcWorkflow.create({
        data: {
          organizationId: target.orgId,
          name: workflowData.name,
          slug,
          description: workflowData.description,
          category: "General",
          tags: ["PMF", "SUH", "Hydrology"],
          visibility: "PRIVATE",
          status: "DRAFT",
          collaborators: {
            create: {
              actorId: target.actorId,
              permission: CollaboratorPermission.ADMIN,
            },
          },
        },
      });

      const nodeIdMap = new Map<string, string>();
      for (const node of workflowData.nodes) {
        const n = await tx.calcNode.create({
          data: {
            calcWorkflowId: workflow.id,
            type: node.type,
            label: node.label,
            positionX: node.positionX,
            positionY: node.positionY,
            config: node.config,
            sortOrder: 0,
          },
        });
        nodeIdMap.set(node.id, n.id);
      }

      for (const edge of workflowData.edges) {
        const s = nodeIdMap.get(edge.sourceNodeId);
        const t = nodeIdMap.get(edge.targetNodeId);
        if (!s || !t) continue;
        await tx.calcEdge.create({
          data: {
            calcWorkflowId: workflow.id,
            sourceNodeId: s,
            targetNodeId: t,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
          },
        });
      }

      console.log(`Success! Created Workflow ID: ${workflow.id} Slug: ${workflow.slug}`);
    });
  }
}

main().catch(console.error);
