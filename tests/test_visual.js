import Table from 'cli-table3';
import chalk from 'chalk';

const country = process.argv[2] || 'Chile';
const techType = process.argv[3] || 'bio';

async function fetchAndVisualize() {
  console.log(chalk.cyan.bold(`\n🚀 [REQUEST SENT] Fetching Regulatory Pathway for [${country.toUpperCase()}] (${techType.toUpperCase()})...`));
  
  let secondsElapsed = 0;
  const progressInterval = setInterval(() => {
    secondsElapsed += 2;
    process.stdout.write(chalk.gray(`\r⏳ Processing... ${secondsElapsed}s elapsed (Waiting for DB / Ollama AI Response)...`));
  }, 2000);

  const startTime = Date.now();

  try {
    const res = await fetch('http://localhost:5000/api/regulatory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, techType })
    });

    clearInterval(progressInterval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear progress text

    const data = await res.json();
    const duration = Date.now() - startTime;

    if (!data.success) {
      console.log(chalk.red.bold('\n❌ API Error:'), data.error);
      if (data.details) console.log(chalk.yellow(`Reason: ${data.details}`));
      return;
    }

    // Common Table Style Config to prevent missing border lines
    const tableStyle = { head: [], border: [] };

    // 1. Meta Banner
    const isDB = data.meta.source === 'database';
    const sourceBadge = isDB 
      ? chalk.bgGreen.black.bold(' SUPABASE DB ') 
      : chalk.bgMagenta.white.bold(' OLLAMA AI GENERATED ');

    console.log('\n' + '='.repeat(60));
    console.log(` Status: ${chalk.green.bold('SUCCESS')} | Source: ${sourceBadge} | Time Taken: ${chalk.yellow((duration / 1000).toFixed(2) + 's')}`);
    console.log('='.repeat(60));

    // 2. Summary Table
    const summaryTable = new Table({
      head: [chalk.cyan.bold('Property'), chalk.cyan.bold('Regulatory Details')],
      colWidths: [22, 50],
      wordWrap: true,
      style: tableStyle
    });

    summaryTable.push(
      ['Target Country', data.summary.target_country],
      ['Technology Type', data.summary.technology_type],
      ['Regulatory Body', chalk.yellow.bold(data.summary.regulatory_authority)],
      ['Est. Timeline', data.summary.estimated_timeline],
      ['Est. Cost (USD)', chalk.green.bold(data.summary.estimated_cost)],
      ['Confidence Score', chalk.blue(data.meta.confidence_score)]
    );

    console.log(chalk.bold.underline('\n📌 REGULATORY OVERVIEW:'));
    console.log(summaryTable.toString());

    // 3. Workflow Table (FIXED HEADER SEPARATOR)
    const workflowTable = new Table({
      head: [chalk.cyan.bold('Step #'), chalk.cyan.bold('Action Plan')],
      colWidths: [12, 60],
      wordWrap: true,
      style: tableStyle
    });

    if (data.workflow && data.workflow.approval_process) {
      data.workflow.approval_process.forEach(item => {
        workflowTable.push([chalk.white.bold(`Step ${item.step_number}`), item.action]);
      });
    }

    console.log(chalk.bold.underline('\n🔄 APPROVAL WORKFLOW:'));
    console.log(workflowTable.toString());

    // 4. Compliance Table
    const complianceTable = new Table({
      head: [chalk.cyan.bold('Required Documents'), chalk.cyan.bold('HS Codes')],
      colWidths: [42, 30],
      wordWrap: true,
      style: tableStyle
    });

    const docs = data.compliance_requirements.required_documents.join('\n• ');
    const hs = data.compliance_requirements.hs_customs_codes.join(', ');

    complianceTable.push([`• ${docs}`, hs || 'N/A']);

    console.log(chalk.bold.underline('\n📋 COMPLIANCE & DOCUMENTS:'));
    console.log(complianceTable.toString());
    console.log('\n');

  } catch (error) {
    clearInterval(progressInterval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    console.log(chalk.red.bold('\n❌ Network Failure:'), error.message);
  }
}

fetchAndVisualize();