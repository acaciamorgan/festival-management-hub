const { utils, writeFile } = require('xlsx-js-style');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqzjthbearpqcrzfdfer.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxemp0aGJlYXJwcWNyemZkZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTQ2MDUsImV4cCI6MjA2ODg5MDYwNX0.DUz_xMU4IW0Z4MsXZ9kVPT5hDp3frdXsHIm6BSfYKvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExport() {
  console.log('Starting test export...');
  
  try {
    // Create workbook
    const workbook = utils.book_new();
    console.log('Workbook created');
    
    // Test simple data
    const testData = [
      { name: 'Test Film 1', director: 'Director 1' },
      { name: 'Test Film 2', director: 'Director 2' }
    ];
    
    const testSheet = utils.json_to_sheet(testData);
    utils.book_append_sheet(workbook, testSheet, 'Test Data');
    console.log('Test sheet added');
    
    // Get real data
    const { data: features, error } = await supabase
      .from('feature_films')
      .select('title, director, producer, original_release_year')
      .limit(5);
    
    console.log('Features query result:', error ? 'ERROR: ' + error.message : `SUCCESS: ${features?.length || 0} records`);
    
    if (features && features.length > 0) {
      const featuresSheet = utils.json_to_sheet(features);
      utils.book_append_sheet(workbook, featuresSheet, 'Feature Films');
      console.log('Features sheet added');
    }
    
    console.log('Workbook sheets:', workbook.SheetNames);
    console.log('Workbook has', workbook.SheetNames.length, 'sheets');
    
    // Try to write file
    const filename = `test-export-${Date.now()}.xlsx`;
    writeFile(workbook, filename);
    console.log('File written successfully:', filename);
    
    return { success: true, filename };
    
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, error: error.message };
  }
}

testExport().then(result => {
  console.log('Final result:', result);
});