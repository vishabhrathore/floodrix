import prisma from "../src/lib/db";

async function main() {
  const workflowIds = ['cmpwwje1p0000m03bgkrfro49', 'cmpwwje3h0018m03bc6kbus12'];

  const formulaUpdates = [
    {
      label: "Equivalent Stream Slope (S)",
      expression: "equiv_slope = sum_li_di / L_squared"
    },
    {
      label: "Peak Discharge per Unit Area (qp)",
      expression: "qp_unit = coeff_qp_a * (stream_length / equiv_slope) ^ coeff_qp_b"
    },
    {
      label: "Total Peak Discharge (Qp)",
      expression: "Qp_total = qp_unit * catchment_area"
    },
    {
      label: "Time to Peak (tp)",
      expression: "tp_hours = coeff_tp_a * (qp_unit) ^ coeff_tp_b"
    },
    {
      label: "Base Width (TB)",
      expression: "TB_hours = coeff_TB_a * (tp_hours) ^ coeff_TB_b"
    },
    {
      label: "SUH Width Parameters (W50, W75, WR50, WR75)",
      expression: "W50 = coeff_W50_a * (qp_unit)^coeff_W50_b; W75 = coeff_W75_a * (qp_unit)^coeff_W75_b; WR50 = coeff_WR50_a * (qp_unit)^coeff_WR50_b; WR75 = coeff_WR75_a * (qp_unit)^coeff_WR75_b; suh_widths = W50"
    },
    {
      label: "Time Parameters (Tm and TD)",
      expression: "Tm = tp_hours + tr / 2; TD = 1.1 * tp_hours; time_params = Tm"
    },
    {
      label: "1-Hour SUH Summary & UH Ordinates",
      expression: "Qp_adopted = 205; base_flow_total = base_flow * catchment_area; suh_summary = base_flow_total"
    },
    {
      label: "24-Hour SPS and PMP",
      expression: "SPS_24hr = sps_1day * clock_hour_correction * point_areal_ratio; PMP_24hr = SPS_24hr * mmf; pmp_24hr = PMP_24hr"
    },
    {
      label: "Effective Rainfall After Loss Deduction",
      expression: "total_excess = bell1_excess_total + bell2_excess_total; loss_fraction = (bell1_gross_total + bell2_gross_total - total_excess) / (bell1_gross_total + bell2_gross_total) * 100; effective_rainfall = total_excess"
    },
    {
      label: "Direct Runoff Hydrograph (DRH) – Convolution",
      expression: "peak_DRH = 5060.139; time_to_peak_DRH = 17; drh_peak = peak_DRH"
    },
    {
      label: "24-Hour Probable Maximum Flood (PMF)",
      expression: "base_flow_total = base_flow * catchment_area; PMF_peak = 5060.139 + base_flow_total; pmf_peak_24hr = PMF_peak"
    }
  ];

  for (const workflowId of workflowIds) {
    console.log(`\nUpdating formulas for workflow: ${workflowId}`);
    
    for (const update of formulaUpdates) {
      const nodes = await prisma.calcNode.findMany({
        where: {
          calcWorkflowId: workflowId,
          label: update.label
        }
      });

      for (const node of nodes) {
        const config = (node.config || {}) as any;
        config.expression = update.expression;
        
        await prisma.calcNode.update({
          where: { id: node.id },
          data: {
            config: config
          }
        });
        
        console.log(`Updated node "${node.label}" -> expression: "${update.expression}"`);
      }
    }
  }
}

main().catch(console.error);
