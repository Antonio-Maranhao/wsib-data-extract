

const request = require('request');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let data = [];

function fetchOrgProfile(orgID) {
  const url = 'https://compass.wsib.on.ca/api/org/getOrgProfile?orgid='+orgID;

  request({
    url: url,
    json: true
  }, function (error, response, body) {
    //console.log('response for ', url, ' is ', body.legalName);
    if (!error && response.statusCode === 200) {
      const aggregated = {
        orgId: body.orgId,
        orgProfile: body
      };
      fetchInjuryClaimsByRegistrationYear(aggregated);
    } else {
      console.log('Error fetching org profile. ', error);
    }
  });
}

function fetchInjuryClaimsByRegistrationYear(aggregatedData) {
  const url = 'https://compass.wsib.on.ca/api/stats/getInjuryClaimsByRegistrationYear?orgid='+aggregatedData.orgId;

  request({
    url: url,
    json: true
  }, function (error, response, body) {
    //console.log('response for ', url, ' is ', body.legalName);
    if (!error && response.statusCode === 200) {
      aggregatedData.injuryClaimsByRegistrationYear = body;
      fetchInjuryRatesByInjuryYear(aggregatedData);
    } else {
      console.log('Error fetching InjuryClaims. ', error);
    }
  });
}

function fetchInjuryRatesByInjuryYear(aggregatedData) {
  const url = 'https://compass.wsib.on.ca/api/stats/getInjuryRatesByInjuryYear?orgid='+aggregatedData.orgId;

  request({
    url: url,
    json: true
  }, function (error, response, body) {
    //console.log('response for ', url, ' is ', body.legalName);
    if (!error && response.statusCode === 200) {
      aggregatedData.injuryRatesByInjuryYear = body;
      fetchTotalBenefitCosts(aggregatedData);
    } else {
      console.log('Error fetching InjuryClaims. ', error);
    }
  });
}

function fetchTotalBenefitCosts(aggregatedData) {
  const url = 'https://compass.wsib.on.ca/api/stats/getTotalBenefitCosts?orgid='+aggregatedData.orgId;

  request({
    url: url,
    json: true
  }, function (error, response, body) {
    //console.log('response for ', url, ' is ', body.legalName);
    if (!error && response.statusCode === 200) {
      aggregatedData.totalBenefitCosts = body;
      formatAndSave(aggregatedData);
    } else {
      console.log('Error fetching InjuryClaims. ', error);
    }
  });
}

// Because lists are missing data for some years, this function fills the missing data with zeros
function collectValues(list, yearField, valueField) {
  const years = [2012, 2013, 2014, 2015, 2016];
  // const numYears = endYear - startYear + 1;
  const values = [];
  years.forEach((year) => {
    const elem = list.find((el) => {
      return el[yearField] === year;
    });
    if (elem) {
      values.push(elem[valueField]);
    } else {
      values.push(null);
    }
  });
  return values;
}

function formatAndSave(aggregatedData) {
  const numYears = 5;
  // const emptyValues = 'n/a,n/a,n/a,n/a,n/a';
  
  let injClaimsPerYear = collectValues(aggregatedData.injuryClaimsByRegistrationYear, 'RegistrationYear', 'Total').join();
  let noLostTimeInjuryRate = collectValues(aggregatedData.injuryRatesByInjuryYear, 'InjuryYear', 'NLT_Rate').join();
  let lostTimeInjuryRate = collectValues(aggregatedData.injuryRatesByInjuryYear, 'InjuryYear', 'LT_Rate').join();
  let lossOfEarnings = collectValues(aggregatedData.totalBenefitCosts, 'BenefitYear', 'LOE').join();
  //console.log(aggregatedData.injuryClaimsByRegistrationYear);
  // let injClaimsPerYear = aggregatedData.injuryClaimsByRegistrationYear.map((el) => {
  //   return '(ic' + el.RegistrationYear + ') ' + el.Total;
  // }).join();
  // if (aggregatedData.injuryClaimsByRegistrationYear.length < numYears) {
  //   injClaimsPerYear = emptyValues;
  // }
  // let noLostTimeInjuryRate = aggregatedData.injuryRatesByInjuryYear.map((el) => {
  //   return '(nlt' + el.InjuryYear + ') ' + el.NLT_Rate;
  // }).join();
  // if (aggregatedData.injuryRatesByInjuryYear.length < numYears) {
  //   noLostTimeInjuryRate = emptyValues;
  // }

  // let lostTimeInjuryRate = aggregatedData.injuryRatesByInjuryYear.map((el) => {
  //   return '(lt' + el.InjuryYear + ') ' + el.LT_Rate;
  // }).join();
  // if (aggregatedData.injuryRatesByInjuryYear.length < numYears) {
  //   lostTimeInjuryRate = emptyValues;
  // }

  // let lossOfEarnings = aggregatedData.totalBenefitCosts.map((el) => {
  //   return '(loe' + el.BenefitYear + ') ' + el.LOE;
  // }).join();
  // if (aggregatedData.totalBenefitCosts.length < numYears) {
  //   lossOfEarnings = emptyValues;
  // }

  let line = `${aggregatedData.orgId},"${aggregatedData.orgProfile.legalName}",${injClaimsPerYear},${noLostTimeInjuryRate},${lostTimeInjuryRate},${lossOfEarnings}`;
  //saveToFile(jsonData, './data/'+jsonData.orgId+'_orgProfile.json');
  //console.log('\n\nLINE:', line);
  data.push(line);
  trytosave();
}

let numElementsToSave = undefined;
function trytosave() {
  if (data.length === numElementsToSave) {
    const str = data.join('\n');
    console.log('\nFINAL DATA');
    console.log(str);
    //saveToFile(str, './data/alldata.csv');
  }
}

function saveToFile(jsonData, filepath) {
  //console.log('saving...', typeof jsonData);
  //fs.writeFile(filepath, JSON.stringify(jsonData), 'utf8', function (err) {
  fs.writeFile(filepath, JSON.stringify(jsonData), 'utf8', function (err) {
    if (err) {
        return console.log(err);
    }
    //console.log("File "+filepath+" was saved!");
}); 
}

function saveOrgInfo(jsonData) {
  saveToFile(jsonData, './data/'+jsonData.orgId+'_orgProfile.json');
}

function iterateCompanies(pageID) {
  //const url = 'https://compass.wsib.on.ca/api/org/search?name=&page='+pageID+'&size=50';
  const url = 'https://compass.wsib.on.ca/api/org/search?name=&page='+pageID+'&size=10&businessActivity=851';

  request({
    url: url,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      if (!numElementsToSave) {
        console.log('# of elements:', body.totalElements);
        //numElementsToSave = body.numberOfElements;
        numElementsToSave = body.totalElements;
      }
      body.content.forEach(function(element) {
        fetchOrgProfile(element[0]);
      }, this);

      if (body.last === false) {
        iterateCompanies(pageID + 1);
      }
    } else {
      console.log('Failed to retrieve company list (page '+pageID+'). Error:', error);
    }
  });
}
data.push('orgId,Company Name,InjClaim-12,InjClaim-13,InjClaim-14,InjClaim-15,InjClaim-16,NoLostTime-12,NoLostTime-13,NoLostTime-14,NoLostTime-15,NoLostTime-16,LostTime-12,LostTime-13,LostTime-14,LostTime-15,LostTime-16,LossOfEarning-12,LossOfEarning-13,LossOfEarning-14,LossOfEarning-15,LossOfEarning-16');
iterateCompanies(0);