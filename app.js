const axios = require('axios')
require('dotenv').config();

const ipApi = 'https://api.ipify.org/?format=json';
const doToken = process.env.DigitalOceanApiToken;
const domainName = process.env.DomainName;
let dnsIpAddress;

const writeLogMessage = (msg) => {
    console.log(`${new Date()}: ${msg}`)
}

const getApiRequestHeaders = () => {
    return doRequestHeaders = {
        headers: {
            Authorization: `Bearer ${doToken}`,
            'Content-Type': 'application/json'
        }
    }
}

const getDomainRecord = async () => {
    const getRecordsResponse = await axios.get(`https://api.digitalocean.com/v2/domains/${domainName}/records`, getApiRequestHeaders());
    const domainRecords = getRecordsResponse.data.domain_records;
    return domainRecords.find(x => x.type === 'A');
}

const run = async () => {
    try {
        const newIp = (await axios.get(ipApi)).data.ip;

        if (!dnsIpAddress) {
            // fetch the DO config
            const record = await getDomainRecord();
            writeLogMessage(`Fetched DNS config for the first time on app startup: ${record.data}`)
            dnsIpAddress = record.data;
        }


        if (dnsIpAddress === newIp) {
            // nothing to do, don't bother updating
            writeLogMessage(`IP Address is still ${newIp}, so not taking further action`);
            return;
        }

        // get the record again so we have the correct recordId
        const record = await getDomainRecord();

        // update config
        const recordUpdate = {
            data: newIp
        };

        await axios.put(`https://api.digitalocean.com/v2/domains/${domainName}/records/${record.Id}`, recordUpdate, getApiRequestHeaders());
        writeLogMessage('***********************************************************************************************************************************');
        writeLogMessage(`Updated IP from ${dnsIpAddress} to ${newIp}`)
        writeLogMessage('***********************************************************************************************************************************');
        dnsIpAddress = newIp;

    } catch (error) {
        console.log(error);
    }
}


(async () => {
    const hourInMilliseconds = 60 * 60 * 1000;

    run();
    setInterval(async function () {
        run();
    }, hourInMilliseconds)

})();