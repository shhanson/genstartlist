const commandLineArgs = require('command-line-args');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const xlsx = require('xlsx');

const CATEGORIES = ['48', '53', '56', '58', '62', '63', '69', '75', '77', '85', '94', '90', '90+', '105', '105+'];
const DIVISIONS = ['Youth', 'Junior', 'Senior', 'Master'];
const CURRENT_YEAR = new Date().getFullYear();


// Array to specify the command-line-args options
const optionDefinitions = [{
  name: 'input_file',
  alias: 'i',
  type: String,
},
{
  name: 'sort_by_categories',
  alias: 'c',
  type: Boolean,
},
{
  name: 'output_file',
  alias: 'o',
  type: String,
  defaultValue: './files/startList.csv',
},
];

const options = commandLineArgs(optionDefinitions);

// If no spreadsheet file is provided, print usage error
if (!options.input_file) {
  console.error('Usage: genstartlist -i <input file>');
  process.exit(1);
}

const INPUTFILEPATH = path.join(options.input_file);

// If the provided output file path does not include .csv, append .csv
if (!options.output_file.includes('.csv')) {
  options.output_file += '.csv';
}
const OUTPUTFILEPATH = path.join(options.output_file);

// Try to read the spreadsheet file provided.
let spreadsheetFile;
try {
  spreadsheetFile = xlsx.readFile(INPUTFILEPATH);
} catch (err) {
  console.error('Read file error.');
  process.exit(1);
}

// Extract the first sheet from the spreadsheet file.
// Athlete registration info must be in the first sheet.
// JSON objects are created for each row, each object/row represents an athlete.
const rawSheet = spreadsheetFile.SheetNames[0];
const rawSheetData = spreadsheetFile.Sheets[rawSheet];
const data = xlsx.utils.sheet_to_json(rawSheetData);

let numMales = 0;
let numFemales = 0;

// Loop for some data processing
for (let i = 0; i < data.length; i++) {
  if (data[i].gender.toLowerCase() === 'f' || data[i].gender.toLowerCase() === 'female') {
    numFemales++;
  }
  if (data[i].gender.toLowerCase() === 'm' || data[i].gender.toLowerCase() === 'male') {
    numMales++;
  }
  data[i].category = CATEGORIES.indexOf(data[i].category);
  data[i].snatchOpener = parseInt(data[i].snatchOpener);
  data[i].cjOpener = parseInt(data[i].cjOpener);
  data[i].birthYear = parseInt(data[i].birthYear);
  data[i].division = getDivision(data[i].birthYear);
}

// Begin sorting data
let allSorted = {};

// If the "-c" option is supplied, sort data by gender, category, and snatchOpener
if (options.sort_by_categories) {
  allSorted = _.chain(data).sortBy('snatchOpener').sortBy('category').sortBy('gender').value();
} else {
  // By default, athletes are sorted by gender, and then by snatchOpener
  allSorted = _.chain(data).sortBy('snatchOpener').sortBy('gender').value();
}

// Begin constructing csv file data (array of arrays; each array represents one row).
const sessionHeader = [
  ['Lot #', 'USAW #', 'Year of Birth', 'Division', 'Weight Class', 'First Name', 'Last Name', 'Snatch', 'C&J', 'Club', 'Coach'],
];
const emptyRow = ['', '', '', '', '', '', '', '', '', '', ''];

const csvArray = [];
csvArray.push(sessionHeader);

for (let i = 0; i < allSorted.length; i++) {
  const athlete = allSorted[i];
  const row = [' ', athlete.usawID, athlete.birthYear, DIVISIONS[athlete.division], CATEGORIES[athlete.category], athlete.firstName, athlete.lastName, athlete.snatchOpener, athlete.cjOpener, athlete.club, athlete.coach];
  // To separate males from females
  if (i === numFemales) {
    csvArray.push(emptyRow);
    csvArray.push(sessionHeader);
  }
  csvArray.push(row);
}

// Take csvArray and turn it into a string to be written to the output file
let csvString = '';
for (let i = 0; i < csvArray.length; i++) {
  csvString += `${csvArray[i].join()}\n`;
}


// Write csvString to a file
fs.writeFile(OUTPUTFILEPATH, csvString, 'utf8', (err) => {
  if (err) {
    console.error('Write file error.');
    process.exit(1);
  }

  console.log(`${OUTPUTFILEPATH} file written.`);
});


function getDivision(birthYear) {
  const age = CURRENT_YEAR - birthYear;
  if (age > 34) {
    return DIVISIONS.indexOf('Master');
  }

  if (age > 20) {
    return DIVISIONS.indexOf('Senior');
  }

  if (age > 17) {
    return DIVISIONS.indexOf('Junior');
  }

  if (age > 13) {
    return DIVISIONS.indexOf('Youth');
  }
}
