# Calculation Report: Betwa River SUH / PMF

*Description:* Calculation workflow for 27-node synthetic unit hydrograph (SUH), storm depth, and PMF convolution (Registry Formula integration).

## Metadata

- **Date/Time:** Jun 8, 2026, 12:23 AM

## 1.0 Executive Summary & Variables

| Variable                 | Label                                  | Value                | Unit           | Description |
| :----------------------- | :------------------------------------- | :------------------- | :------------- | :---------- |
| `Qp`                   | **Peak discharge**               | **12,929.806** | `cumec`      | —          |
| `TB`                   | **TB**                           | **14.4**       | `hr`         | —          |
| `TD`                   | **TD**                           | **3.170**      | `—`         | —          |
| `Tm`                   | **Time to rise**                 | **3.382**      | `hr`         | —          |
| `qp`                   | **Peak unit discharge**          | **14.77**      | `cumec/sqkm` | —          |
| `tp`                   | **Time to peak**                 | **2.882**      | `hr`         | —          |
| `tr`                   | **Unit rainfall duration tr**    | **1**          | `hr`         | —          |
| `W50`                  | **W50**                          | **33.735**     | `hr`         | —          |
| `W75`                  | **W75**                          | **19.188**     | `hr`         | —          |
| `mmf`                  | **Moisture Maximisation Factor** | **1.12**       | `—`         | —          |
| `WR50`                 | **WR50**                         | **12.995**     | `hr`         | —          |
| `WR75`                 | **WR75**                         | **9.154**      | `hr`         | —          |
| `a_TB`                 | **a_TB**                         | **8.375**      | `—`         | —          |
| `a_qp`                 | **a_qp**                         | **1.161**      | `—`         | —          |
| `a_tp`                 | **a_tp**                         | **0.433**      | `—`         | —          |
| `b_TB`                 | **b_TB**                         | **0.512**      | `—`         | —          |
| `b_qp`                 | **b_qp**                         | **0.635**      | `—`         | —          |
| `b_tp`                 | **b_tp**                         | **0.704**      | `—`         | —          |
| `a_W50`                | **a_W50**                        | **2.284**      | `—`         | —          |
| `a_W75`                | **a_W75**                        | **1.331**      | `—`         | —          |
| `b_W50`                | **b_W50**                        | **1**          | `—`         | —          |
| `b_W75`                | **b_W75**                        | **0.991**      | `—`         | —          |
| `a_WR50`               | **a_WR50**                       | **0.827**      | `—`         | —          |
| `a_WR75`               | **a_WR75**                       | **0.561**      | `—`         | —          |
| `b_WR50`               | **b_WR50**                       | **1.023**      | `—`         | —          |
| `b_WR75`               | **b_WR75**                       | **1.037**      | `—`         | —          |
| `pmp_cm`               | **PMP for storm duration**       | **15.855**     | `cm`         | —          |
| `bell1_cm`             | **bell1_cm**                     | **11.574**     | `cm`         | —          |
| `bell2_cm`             | **bell2_cm**                     | **4.281**      | `cm`         | —          |
| `pmf_peak`             | **Peak PMF**                     | **96,956.214** | `cumec`      | —          |
| `sub_zone`             | **CWC sub-zone (MCQ)**           | **3a**         | `—`         | —          |
| `base_flow`            | **Base flow per sq.km**          | **0.018**      | `cumec/sqkm` | —          |
| `loss_rate`            | **Uniform loss φ**              | **0.23**       | `cm/hr`      | —          |
| `initial_rl`           | **initial_rl**                   | **497.00**     | `—`         | —          |
| `sps_dur_cm`           | **SPS for storm duration**       | **14.156**     | `cm`         | —          |
| `equiv_slope`          | **Equivalent slope S**           | **1.4462**     | `m/km`       | —          |
| `pmf_peak_hr`          | **Time of peak**                 | **13**         | `hr`         | —          |
| `uh_depth_cm`          | **UH volume check (≈1 cm)**     | **57.5281**    | `cm`         | —          |
| `bell_pct_1st`         | **1st 12-hr bell %**             | **73**         | `%`          | —          |
| `sps_point_cm`         | **sps_point_cm**                 | **13.4007**    | `cm`         | —          |
| `stream_length`        | **Length of longest stream L**   | **79.367**     | `km`         | —          |
| `catchment_area`       | **Catchment area A**             | **875.41**     | `sq.km`      | —          |
| `areal_reduction`      | **Point-to-areal factor**        | **0.9185**     | `—`         | —          |
| `base_flow_total`      | **Base flow**                    | **15.757**     | `cumec`      | —          |
| `centroid_length`      | **Length to centroid Lc**        | **76.044**     | `km`         | —          |
| `clock_hour_corr`      | **Clock-Hour Correction**        | **1.15**       | `—`         | —          |
| `storm_duration_hr`    | **Storm duration (MCQ)**         | **24**         | `hr`         | —          |
| `sum_li_di_prev_di`    | **Σ Lᵢ·(Dᵢ₋₁+Dᵢ)**        | **9,109.531**  | `—`         | —          |
| `weighted_rainfall_mm` | **weighted_rainfall_mm**         | **134.0075**   | `mm`         | —          |

## 2.0 Calculation Methodology & Proof

### 2.1 Stream Profile (chainage, RL) (INPUT)

#### Input Parameters

Initialized with inputs:

- **Profile points [{chainage, rl}]** (`stream_profile`): **[{"rl":497,"chainage":0}, {"rl":492,"chainage":4.367}, {"rl":468,"chainage":11.867}, {"rl":439,"chainage":19.367}, {"rl":425,"chainage":26.867}, {"rl":404,"chainage":34.367}, {"rl":391,"chainage":41.867}, {"rl":375,"chainage":49.367}, {"rl":365,"chainage":56.867}, {"rl":360,"chainage":64.367}, {"rl":355,"chainage":71.867}, {"rl":348,"chainage":79.367}]**

| Parameter                       | Key                | Value                                                                                                                                                                                                                                                                                                                                                                        | Unit |
| :------------------------------ | :----------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| Profile points [{chainage, rl}] | `stream_profile` | **[{"rl":497,"chainage":0}, {"rl":492,"chainage":4.367}, {"rl":468,"chainage":11.867}, {"rl":439,"chainage":19.367}, {"rl":425,"chainage":26.867}, {"rl":404,"chainage":34.367}, {"rl":391,"chainage":41.867}, {"rl":375,"chainage":49.367}, {"rl":365,"chainage":56.867}, {"rl":360,"chainage":64.367}, {"rl":355,"chainage":71.867}, {"rl":348,"chainage":79.367}]** | —   |

### 2.2 PMP Adjustments (INPUT)

#### Input Parameters

Initialized with inputs:

- **Clock-Hour Correction** (`clock_hour_corr`): **1.15**
- **Moisture Maximisation Factor** (`mmf`): **1.12**
- **1st 12-hr bell %** (`bell_pct_1st`): **73**

| Parameter                    | Key                 | Value          | Unit |
| :--------------------------- | :------------------ | :------------- | :--- |
| Clock-Hour Correction        | `clock_hour_corr` | **1.15** | —   |
| Moisture Maximisation Factor | `mmf`             | **1.12** | —   |
| 1st 12-hr bell %             | `bell_pct_1st`    | **73**   | —   |

### 2.3 Isohyetal Bands (INPUT)

#### Input Parameters

Initialized with inputs:

- **[{area_sqkm, iso_min_mm, iso_max_mm}]** (`isohyet_bands`): **[{"area_sqkm":200,"iso_max_mm":120,"iso_min_mm":100}, {"area_sqkm":300,"iso_max_mm":140,"iso_min_mm":120}, {"area_sqkm":375.41,"iso_max_mm":160,"iso_min_mm":140}]**

| Parameter                             | Key               | Value                                                                                                                                                                        | Unit |
| :------------------------------------ | :---------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| [{area_sqkm, iso_min_mm, iso_max_mm}] | `isohyet_bands` | **[{"area_sqkm":200,"iso_max_mm":120,"iso_min_mm":100}, {"area_sqkm":300,"iso_max_mm":140,"iso_min_mm":120}, {"area_sqkm":375.41,"iso_max_mm":160,"iso_min_mm":140}]** | —   |

### 2.4 Catchment Parameters (INPUT)

#### Input Parameters

Initialized with inputs:

- **Catchment area A** (`catchment_area`): **875.41**
- **Length of longest stream L** (`stream_length`): **79.367**
- **Length to centroid Lc** (`centroid_length`): **76.044**
- **Uniform loss φ** (`loss_rate`): **0.23**
- **Base flow per sq.km** (`base_flow`): **0.018**
- **Unit rainfall duration tr** (`tr`): **1**
- **CWC sub-zone (MCQ)** (`sub_zone`): **3a**

| Parameter                  | Key                 | Value            | Unit |
| :------------------------- | :------------------ | :--------------- | :--- |
| Catchment area A           | `catchment_area`  | **875.41** | —   |
| Length of longest stream L | `stream_length`   | **79.367** | —   |
| Length to centroid Lc      | `centroid_length` | **76.044** | —   |
| Uniform loss φ            | `loss_rate`       | **0.23**   | —   |
| Base flow per sq.km        | `base_flow`       | **0.018**  | —   |
| Unit rainfall duration tr  | `tr`              | **1**      | —   |
| CWC sub-zone (MCQ)         | `sub_zone`        | **3a**     | —   |

### 2.5 Lookup Sub-zone Coefficients (CUSTOM_CODE)

#### Script Output

Executed custom code block:

- **a_tp**: **0.433**
- **b_tp**: **0.704**
- **a_qp**: **1.161**
- **b_qp**: **0.635**
- **a_TB**: **8.375**
- **b_TB**: **0.512**
- **a_W50**: **2.284**
- **b_W50**: **1**
- **a_W75**: **1.331**
- **b_W75**: **0.991**
- **a_WR50**: **0.827**
- **b_WR50**: **1.023**
- **a_WR75**: **0.561**
- **b_WR75**: **1.037**

| Variable | Value |
| :--------- | :-------------- |
| `a_tp` | **0.433** |
| `b_tp` | **0.704** |
| `a_qp` | **1.161** |
| `b_qp` | **0.635** |
| `a_TB` | **8.375** |
| `b_TB` | **0.512** |
| `a_W50` | **2.284** |
| `b_W50` | **1** |
| `a_W75` | **1.331** |
| `b_W75` | **0.991** |
| `a_WR50` | **0.827** |
| `b_WR50` | **1.023** |
| `a_WR75` | **0.561** |
| `b_WR75` | **1.037** |

### 2.6 Equivalent Stream Slope (CUSTOM_CODE)

#### Table 1 - Computation of Equivalent Slope (S)

|      S.No.      | Chainage (Kms) | RL of River bed (m) | each Segment | above datum (Di) | Di-1 + Di (m) | Li × (Di-1 + Di) |
| :-------------: | :------------: | :-----------------: | :----------: | :--------------: | :-----------: | :---------------: |
|       —       |     0.000     |       497.00       |    0.000    |       0.00       |     0.00     |       0.00       |
|        1        |     4.367     |       492.00       |    4.367    |      144.00      |    293.00    | **1279.53** |
|        2        |     11.867     |       468.00       |    7.500    |      120.00      |    264.00    | **1980.00** |
|        3        |     19.367     |       439.00       |    7.500    |      91.00      |    211.00    | **1582.50** |
|        4        |     26.867     |       425.00       |    7.500    |      77.00      |    168.00    | **1260.00** |
|        5        |     34.367     |       404.00       |    7.500    |      56.00      |    133.00    | **997.50** |
|        6        |     41.867     |       391.00       |    7.500    |      43.00      |     99.00     | **742.50** |
|        7        |     49.367     |       375.00       |    7.500    |      27.00      |     70.00     | **525.00** |
|        8        |     56.867     |       365.00       |    7.500    |      17.00      |     44.00     | **330.00** |
|        9        |     64.367     |       360.00       |    7.500    |      12.00      |     29.00     | **217.50** |
|       10       |     71.867     |       355.00       |    7.500    |       7.00       |     19.00     | **142.50** |
|       11       |     79.367     |       348.00       |    7.500    |       0.00       |     7.00     |  **52.50**  |
| **TOTAL** |                |                    |              |                  |              | **9109.53** |

- **Equivalent stream Slope (S)** = $\Sigma(L_i \cdot (D_{i-1} + D_i)) / L^2$ = **1.44616 m/Km**

### 2.7 Peak Unit Discharge (qp) (FORMULA)

#### Calculation

Expression:

```math
qp = a_qp · (L/S)^b_qp
```

- Target: **qp**
- Result: **14.77**

| Parameter    | Value           |
| :----------- | :-------------- |
| **qp** | **14.77** |

### 2.8 Time to Peak (tp) (FORMULA)

#### Calculation

Expression:

```math
tp = a_tp · qp^b_tp
```

- Target: **tp**
- Result: **2.882**

| Parameter    | Value           |
| :----------- | :-------------- |
| **tp** | **2.882** |

### 2.9 Time to Rise (Tm) (FORMULA)

#### Calculation

Expression:

```math
Tm = tp + tr/2
```

- Target: **Tm**
- Result: **3.382**

| Parameter    | Value           |
| :----------- | :-------------- |
| **Tm** | **3.382** |

### 2.10 Base Width (TB) (FORMULA)

#### Calculation

Expression:

```math
TB = a_TB · tp^b_TB
```

- Target: **TB**
- Result: **14.4**

| Parameter    | Value          |
| :----------- | :------------- |
| **TB** | **14.4** |

### 2.11 Peak Discharge (Qp) (FORMULA)

#### Calculation

Expression:

```math
Qp = qp · A
```

- Target: **Qp**
- Result: **12929.8**

| Parameter    | Value             |
| :----------- | :---------------- |
| **Qp** | **12929.8** |

### 2.12 Width at 50% Qp (W50) (FORMULA)

#### Calculation

Expression:

```math
W50 = a_W50 · qp^b_W50
```

- Target: **W50**
- Result: **33.735**

| Parameter     | Value            |
| :------------ | :--------------- |
| **W50** | **33.735** |

### 2.13 Rising Limb Width 75% (WR75) (FORMULA)

#### Calculation

Expression:

```math
WR75 = a_WR75 · qp^b_WR75
```

- Target: **WR75**
- Result: **9.154**

| Parameter      | Value           |
| :------------- | :-------------- |
| **WR75** | **9.154** |

### 2.14 Width at 75% Qp (W75) (FORMULA)

#### Calculation

Expression:

```math
W75 = a_W75 · qp^b_W75
```

- Target: **W75**
- Result: **19.188**

| Parameter     | Value            |
| :------------ | :--------------- |
| **W75** | **19.188** |

### 2.15 Rising Limb Width 50% (WR50) (FORMULA)

#### Calculation

Expression:

```math
WR50 = a_WR50 · qp^b_WR50
```

- Target: **WR50**
- Result: **12.995**

| Parameter      | Value            |
| :------------- | :--------------- |
| **WR50** | **12.995** |

### 2.16 Build 1-hr UH Ordinate Array (CUSTOM_CODE)

#### Table 2 - Computation of 1-hour Synthetic Unit hydrograph Parameters

| Sl. No. | Parameter      |    Unit    | Formula / Coefficient Source              |  Computed Value  |   Adopted Value   |
| :-----: | :------------- | :---------: | :---------------------------------------- | :---------------: | :---------------: |
|    1    | **tr**   |    Hours    | Unit duration                             |    **1**    |    **1**    |
|    2    | **tp**   |    Hours    | $tp = a_{tp} cdot (L/S)^{b_{tp}}$       |  **2.882**  |  **2.882**  |
|    3    | **qp**   | Cumec/sq.km | $qp = a_{qp} cdot (L/S)^{b_{qp}}$       |  **14.77**  |  **14.77**  |
|    4    | **Qp**   |    Cumec    | $Qp = qp cdot A$                        | **12929.8** | **12929.8** |
|    5    | **Tm**   |    Hours    | $Tm = tp + tr/2$                        |  **3.382**  |  **3.382**  |
|    6    | **W50**  |    Hours    | $W_{50} = a_{W50} cdot qp^{b_{W50}}$    | **33.735** | **33.735** |
|    7    | **W75**  |    Hours    | $W_{75} = a_{W75} cdot qp^{b_{W75}}$    | **19.188** | **19.188** |
|    8    | **WR50** |    Hours    | $WR_{50} = a_{WR50} cdot qp^{b_{WR50}}$ | **12.995** | **12.995** |
|    9    | **WR75** |    Hours    | $WR_{75} = a_{WR75} cdot qp^{b_{WR75}}$ |  **9.154**  |  **9.154**  |
|   10   | **TB**   |    Hours    | $TB = a_{TB} cdot tp^{b_{TB}}$          |  **14.4**  |  **14.4**  |
|   11   | **TD**   |    Hours    | $TD = 1.1 cdot tp$                      |  **3.170**  |  **3.170**  |

---

#### Table 4 - Adjusted Unit Hydrograph Coordinates

| Sno. | Time (hours) | Ordinates of 1 hour SUH (cumec) |
| :--: | :----------: | :-----------------------------: |
|  0  |     0.00     |         **0.00**         |
|  1  |     1.00     |        **3823.12**        |
|  2  |     2.00     |        **7646.25**        |
|  3  |     3.00     |       **11469.37**       |
|  4  |     4.00     |       **12730.72**       |
|  5  |     5.00     |       **12408.57**       |
|  6  |     6.00     |       **12086.42**       |
|  7  |     7.00     |       **11764.27**       |
|  8  |     8.00     |       **11442.12**       |
|  9  |     9.00     |       **11119.97**       |
|  10  |    10.00    |       **10797.82**       |
|  11  |    11.00    |       **10475.67**       |
|  12  |    12.00    |       **10153.52**       |
|  13  |    13.00    |        **9831.37**        |
|  14  |    14.00    |        **3942.01**        |
|  15  |    15.00    |        **398.99**        |

**Total Volume Check**: **57.5281 cm** (Target: ≈ 1.0 cm)

### 2.17 Unit Hydrograph Chart (CHART)

```chart
{
  "title": "1-Hour Synthetic Unit Hydrograph (SUH)",
  "chartType": "line",
  "xLabel": "Time (hours)",
  "yLabel": "Discharge (cumec)",
  "xValues": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  "yDataSeries": [{"name":"Unit Hydrograph","values":[0,3823.1241868716734,7646.248373743347,11469.37256061502,12730.717398544948,12408.567558002791,12086.417717460634,11764.267876918479,11442.118036376321,11119.968195834164,10797.818355292007,10475.66851474985,10153.518674207695,9831.368833665538,3942.0140243902415,398.9859905369262]}]
}
```

### 2.18 Storm Duration (INPUT)

#### Input Parameters

Initialized with inputs:

- **Storm duration (MCQ)** (`storm_duration_hr`): **24**

| Parameter            | Key                   | Value        | Unit |
| :------------------- | :-------------------- | :----------- | :--- |
| Storm duration (MCQ) | `storm_duration_hr` | **24** | —   |

### 2.19 Weighted Mean Rainfall (Isohyetal) (CUSTOM_CODE)

#### Script Output

Executed custom code block:

- **weighted_rainfall_mm**: **134.007**
- **sps_point_cm**: **13.4007**

| Variable | Value |
| :----------------------- | :---------------- |
| `weighted_rainfall_mm` | **134.007** |
| `sps_point_cm` | **13.4007** |

### 2.20 Areal Reduction Factor (interpolated) (CUSTOM_CODE)

#### Script Output

Executed custom code block:

- **areal_reduction**: **0.918546**

| Variable            | Value              |
| :------------------ | :----------------- |
| `areal_reduction` | **0.918546** |

### 2.21 Storm-duration SPS (FORMULA)

#### Calculation

Expression:

```math
SPS_dur = SPS_point · CHC · ARF
```

- Target: **sps_dur_cm**
- Result: **14.156**

| Parameter            | Value            |
| :------------------- | :--------------- |
| **sps_dur_cm** | **14.156** |

### 2.22 Total Base Flow (FORMULA)

#### Calculation

Expression:

```math
Qb = qb · A
```

- Target: **base_flow_total**
- Result: **15.757**

| Parameter                 | Value            |
| :------------------------ | :--------------- |
| **base_flow_total** | **15.757** |

### 2.23 PMP Depth (FORMULA)

#### Calculation

Expression:

```math
PMP = SPS · MMF
```

- Target: **pmp_cm**
- Result: **15.855**

| Parameter        | Value            |
| :--------------- | :--------------- |
| **pmp_cm** | **15.855** |

### 2.24 1st 12-hr Bell Depth (FORMULA)

#### Calculation

Expression:

```math
bell_n = PMP · bell% / 100
```

- Target: **bell1_cm**
- Result: **11.574**

| Parameter          | Value            |
| :----------------- | :--------------- |
| **bell1_cm** | **11.574** |

### 2.25 2nd 12-hr Bell Depth (FORMULA)

#### Calculation

Expression:

```math
bell_remainder = PMP_total − bell_assigned
```

- Target: **bell2_cm**
- Result: **4.281**

| Parameter          | Value           |
| :----------------- | :-------------- |
| **bell2_cm** | **4.281** |

### 2.26 Hyetograph + Loss + Critical Sequencing (CUSTOM_CODE)

The 24-hour storm is divided into two 12-hour bells. Hourly rainfall is distributed using the 12-hour sub-duration cumulative percentage curve and sorted in descending order (critical sequencing) after subtracting the uniform loss rate of **0.23 cm/hr**.

#### Table 5 - Hourly Rainfall & Excess Distribution

| Hour | Bell 1 Gross (cm) | Bell 1 Excess (cm) | Bell 2 Gross (cm) | Bell 2 Excess (cm) |
| :--: | :---------------: | :----------------: | :---------------: | :----------------: |
|  1  |       2.394       |  **2.164**  |       0.886       |  **0.656**  |
|  2  |       1.649       |  **1.419**  |       0.610       |  **0.380**  |
|  3  |       0.967       |  **0.737**  |       0.358       |  **0.128**  |
|  4  |       0.840       |  **0.610**  |       0.311       |  **0.081**  |
|  5  |       0.840       |  **0.610**  |       0.311       |  **0.081**  |
|  6  |       0.777       |  **0.547**  |       0.287       |  **0.057**  |
|  7  |       0.745       |  **0.515**  |       0.276       |  **0.046**  |
|  8  |       0.729       |  **0.499**  |       0.270       |  **0.040**  |
|  9  |       0.698       |  **0.468**  |       0.258       |  **0.028**  |
|  10  |       0.698       |  **0.468**  |       0.258       |  **0.028**  |
|  11  |       0.650       |  **0.420**  |       0.240       |  **0.010**  |
|  12  |       0.587       |  **0.357**  |       0.217       |  **0.000**  |

### 2.27 Convolve UH × Excess → DRH (CUSTOM_CODE)

The hourly excess rainfall arrays from Bell 1 and Bell 2 (shifted by 12 hours) are convolved with the 1-hour Synthetic Unit Hydrograph.

#### Table 6 - Direct Runoff Hydrograph Coordinates

| Hour | DRH Ordinate (cumec) |
| :--: | :------------------: |
|  0  |    **0.00**    |
|  1  |  **8273.52**  |
|  2  |  **21971.67**  |
|  3  |  **38488.01**  |
|  4  |  **51793.73**  |
|  5  |  **60371.02**  |
|  6  |  **66903.90**  |
|  7  |  **72675.64**  |
|  8  |  **77826.46**  |
|  9  |  **82397.61**  |
|  10  |  **86570.74**  |
|  11  |  **90254.83**  |
|  12  |  **93313.76**  |
|  13  |  **96940.46**  |
|  14  |  **88155.18**  |
|  15  |  **75457.79**  |
|  16  |  **66854.67**  |
|  17  |  **60205.67**  |
|  18  |  **53765.19**  |
|  19  |  **47690.14**  |
|  20  |  **42009.53**  |
|  21  |  **36553.08**  |
|  22  |  **31402.31**  |
|  23  |  **26386.66**  |
|  24  |  **21664.32**  |
|  25  |  **17482.69**  |
|  26  |  **11924.48**  |
|  27  |  **7061.70**  |
|  28  |  **4582.46**  |
|  29  |  **3408.97**  |
|  30  |  **2528.35**  |
|  31  |  **1823.07**  |
|  32  |  **1284.68**  |
|  33  |   **844.54**   |
|  34  |   **507.97**   |
|  35  |   **224.33**   |
|  36  |   **52.34**   |
|  37  |    **4.17**    |
|  38  |    **0.00**    |

### 2.28 PMF = DRH + Base Flow (CUSTOM_CODE)

By adding the base flow to each ordinate of the Direct Runoff Hydrograph (DRH), the final Probable Maximum Flood (PMF) is computed.

#### 🔑 Peak Flood Results

- **Peak PMF Discharge**: **96956.2** cumec
- **Time of Peak**: Hour **13**
- **Total Base Flow**: **15.757** cumec

---

#### Table 7 - PMF Hydrograph Coordinates

| Hour | DRH Ordinate (cumec) | Base Flow (cumec) | PMF Ordinate (cumec) |
| :--: | :------------------: | :---------------: | :------------------: |
|  0  |         0.00         |       15.76       |   **15.76**   |
|  1  |       8273.52       |       15.76       |  **8289.28**  |
|  2  |       21971.67       |       15.76       |  **21987.43**  |
|  3  |       38488.01       |       15.76       |  **38503.77**  |
|  4  |       51793.73       |       15.76       |  **51809.49**  |
|  5  |       60371.02       |       15.76       |  **60386.78**  |
|  6  |       66903.90       |       15.76       |  **66919.66**  |
|  7  |       72675.64       |       15.76       |  **72691.40**  |
|  8  |       77826.46       |       15.76       |  **77842.22**  |
|  9  |       82397.61       |       15.76       |  **82413.37**  |
|  10  |       86570.74       |       15.76       |  **86586.49**  |
|  11  |       90254.83       |       15.76       |  **90270.58**  |
|  12  |       93313.76       |       15.76       |  **93329.52**  |
|  13  |       96940.46       |       15.76       |  **96956.21**  |
|  14  |       88155.18       |       15.76       |  **88170.93**  |
|  15  |       75457.79       |       15.76       |  **75473.55**  |
|  16  |       66854.67       |       15.76       |  **66870.42**  |
|  17  |       60205.67       |       15.76       |  **60221.43**  |
|  18  |       53765.19       |       15.76       |  **53780.94**  |
|  19  |       47690.14       |       15.76       |  **47705.90**  |
|  20  |       42009.53       |       15.76       |  **42025.29**  |
|  21  |       36553.08       |       15.76       |  **36568.84**  |
|  22  |       31402.31       |       15.76       |  **31418.07**  |
|  23  |       26386.66       |       15.76       |  **26402.42**  |
|  24  |       21664.32       |       15.76       |  **21680.08**  |
|  25  |       17482.69       |       15.76       |  **17498.45**  |
|  26  |       11924.48       |       15.76       |  **11940.24**  |
|  27  |       7061.70       |       15.76       |  **7077.45**  |
|  28  |       4582.46       |       15.76       |  **4598.22**  |
|  29  |       3408.97       |       15.76       |  **3424.73**  |
|  30  |       2528.35       |       15.76       |  **2544.11**  |
|  31  |       1823.07       |       15.76       |  **1838.83**  |
|  32  |       1284.68       |       15.76       |  **1300.43**  |
|  33  |        844.54        |       15.76       |   **860.30**   |
|  34  |        507.97        |       15.76       |   **523.73**   |
|  35  |        224.33        |       15.76       |   **240.08**   |
|  36  |        52.34        |       15.76       |   **68.10**   |
|  37  |         4.17         |       15.76       |   **19.92**   |
|  38  |         0.00         |       15.76       |   **15.76**   |

### 2.29 PMF Hydrograph Chart (CHART)

```chart
{
  "title": "Probable Maximum Flood (PMF) Hydrograph",
  "chartType": "area",
  "xLabel": "Time (hours)",
  "yLabel": "Discharge (cumec)",
  "xValues": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38],
  "yDataSeries": [{"name":"PMF Hydrograph","values":[15.757,8289.280546836999,21987.429765269797,38503.76617369474,51809.490972240696,60386.77934514066,66919.66195101173,72691.3982328277,77842.22120419164,82413.36710902258,86586.49284869566,90270.58232867025,93329.5151084293,96956.21402430617,88170.93262700041,75473.55191523745,66870.4228788058,60221.42567507165,53780.94282586331,47705.898598806874,42025.28742745003,36568.835076116826,31418.066546917835,26402.41585681489,21680.081920776793,17498.45147396024,11940.24068925934,7077.453222601016,4598.218860068876,3424.7286246668004,2544.1051669942062,1838.826744433391,1300.432311828271,860.2991002339583,523.7288355954964,240.08451532442712,68.09527149345838,19.92230442997508,15.757]}, {"name":"Direct Runoff (DRH)","values":[0,8273.523546837,21971.672765269795,38488.00917369474,51793.7339722407,60371.022345140664,66903.90495101173,72675.64123282771,77826.46420419164,82397.61010902259,86570.73584869567,90254.82532867025,93313.7581084293,96940.45702430618,88155.17562700041,75457.79491523745,66854.6658788058,60205.668675071654,53765.185825863315,47690.14159880688,42009.53042745003,36553.07807611683,31402.309546917833,26386.658856814887,21664.32492077679,17482.694473960237,11924.483689259341,7061.696222601016,4582.461860068876,3408.9716246668004,2528.348166994206,1823.069744433391,1284.6753118282709,844.5421002339583,507.9718355954965,224.3275153244271,52.33827149345838,4.165304429975082,0]}]
}
```

---

*Report generated automatically by Floodrix Workflow Engine.*
