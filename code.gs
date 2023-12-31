var ss = SpreadsheetApp.getActiveSpreadsheet()
var sheet = ss.getSheetByName('Secret Santa')

function setupFn() {
  if (sheet == null) {
    sheet = ss.getSheets()[0].setName('Secret Santa')
    sheet.deleteColumns(4,23);
  }
  sheet.getRange('A1:C')
    .setFontFamily("Georgia")
    .setFontSize(12)
    .setVerticalAlignment("middle")
  sheet.getRange('C2:C')
    .setHorizontalAlignment("center")
  sheet.getRange('A1:C1')
       .setValues([['Name',	'Email',	'Status']])
       .setBackgroundRGB(225, 225, 225)
       .setFontWeight("bold")
       .setHorizontalAlignment("center")
  sheet.getRange('B2:B').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireTextIsEmail()
      .setAllowInvalid(false)
      .setHelpText('Please enter valid email address')
      .build())
  sheet.getRange('A2:A').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireFormulaSatisfied('=COUNTIF(A$2:A$1000,A2)=1')
      .setAllowInvalid(false)
      .setHelpText('The name is already entered')
      .build())
    
  var rules = sheet.getConditionalFormatRules();
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied("=COUNTIF(A$2:A,A2)>1")
      .setFontColor('red')
      .setBold(true)
      .setRanges([sheet.getRange('A2:B')])
      .build());
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('Sent')
      .setFontColor('green')
      .setRanges([sheet.getRange('C2:C')])
      .build());
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('Error')
      .setFontColor('red')
      .setRanges([sheet.getRange('C2:C')])
      .build());
  sheet.setConditionalFormatRules(rules);
}

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) { 
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex); 
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]; 
  }
  return array;
}

function santaPairingFn() {
  //get the last row for secting range
  var lastRowNum = sheet.getLastRow()  

  //clear the previuos result
  sheet.getRange('C2:C').clearContent()

  //collect the names and their emails
  var peopleList = sheet.getRange('A2:B'+lastRowNum).getValues()

  var uniqueSet = []
  for (people in peopleList) {
    uniqueSet.push(peopleList[people][0])
  }
  
  if ([...new Set(uniqueSet)].length < lastRowNum-1) {
  var htmlOutput = HtmlService
    .createHtmlOutput(
      `<p>There are some repeated names.</p>
      <p>Secret Santa Pairing cannot be generated.</p>
      <p>Please add some initilas and try again</p>
      <p>Thank you!</p>`
    ).setWidth(300).setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Sorry...');
    return null
  }

  var santaList = peopleList.slice(0,peopleList.length)

  //shuffle the list
  santaList = shuffle(santaList)

  //prepare list of gift receivers
  var receiverList = santaList.slice(-1).concat(santaList.slice(0,santaList.length-1))

  // var htmlContent = HtmlService.createHtmlOutputFromFile('emailBody').getContent();
   var template = HtmlService.createTemplateFromFile('emailBody');
  var statusObj = {}
  for (people in santaList) {
    var name = {
      santa: santaList[people][0],
      receiver : receiverList[people][0],
    }
    template.name = name

    var htmlBody = template.evaluate().getContent();

    var presentYear = Utilities.formatDate(new Date(), "Asia/Calcutta", "dd-MM-yyyy").slice(6,10);
    try {
      MailApp.sendEmail({
        name    : 'Santa Claus',
        to      : santaList[people][1],
        subject : `Secret Santa Pairing - ${presentYear}`,
        htmlBody: htmlBody,
      });
      statusObj[name.santa] = ['Sent']
    } catch (err) {
      statusObj[name.santa] = ['Error']
    }
  }
  errorStatusList = ''
  var row = 2
  for (people in peopleList){
    var mailStatus = statusObj[peopleList[people][0]]
    if (mailStatus == 'Error') {
      errorStatusList += `<p>${peopleList[people]}</p>`
    }

    sheet.getRange('C'+row.toString()).setValue(mailStatus)
    row += 1
  }
  Utilities.sleep(60000)
  var threads = GmailApp.search('Secret Santa Pairing');
  for (thread in threads) {
    try{
      // This will delete threads permanently. But Gmail API should be added to into Services (Leftside)
      Gmail.Users.Threads.remove('me', threads[thread].getId());
    } catch (err) {
      // This will delete the mails/threads from Sent Mail to Bin
      GmailApp.getThreadById(threads[thread].getId()).moveToTrash()
    }
  }
  if (errorStatusList.length > 1) {
    SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(errorStatusList).setTitle('Unable to send mails to following people:'));
  }
}

function clearAllFn() {
  sheet.getRange('A2:C').clearContent()
}


function onOpen() {
  var ui = SpreadsheetApp.getUi()
  ui.createMenu('Secret Santa Gift Exchange')
    .addItem('Setup Sheet', 'setupFn')
    .addSeparator()
    .addItem('Secret Santa Pairing', 'santaPairingFn')
    .addSeparator()
    .addItem('Clear All', 'clearAllFn')
  .addToUi();
}
