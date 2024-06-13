const fetch = require("node-fetch");

async function login(login, password) {
    console.log('BUSINESS CHAIN :: STARTING LOGIN');
    let response = await fetch('https://businesschain.io/api/v1/authorization/session-id', {method: 'GET'}),
        resp = await response.text(),
        session = resp;

    console.log('BUSINESS CHAIN :: GETTING SESSION :: ', session);

    response = await fetch('https://businesschain.io/api/v1/authorization/get-sso-url?redirectUrl=https://businesschain.io/get-token', {
        method: 'GET',
        headers: {'Session-Id': session}
    });
    resp = await response.text();
    console.log('BUSINESS CHAIN :: GETTING API KEY :: ', resp);

    let url = new URL(resp), apiKey = url.searchParams.get('api_key');
    url = new URL('https://id.businesschain.io/auth');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('session', session);
    url.searchParams.set('session_name', 'JSESSIONID');
    console.log('BUSINESS CHAIN :: LOGGING IN :: ', url.href);
    let body = JSON.stringify({login, password, ldap:false});
    response = await fetch(url.href, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': (new TextEncoder().encode(body)).length
        },
        body
    });
    resp = await response.json();
    console.log('BUSINESS CHAIN :: LOGIN RESULT :: ', JSON.stringify(resp));

    response = await fetch('https://businesschain.io/api/v1/authorization/get-token', {
        method: 'GET',
        headers: {'Session-Id': session}
    });
    resp = await response.json();
    console.log('BUSINESS CHAIN :: GET TOKEN :: ', JSON.stringify(resp));
    return {token: resp.access_token, session};
}

async function getTemplate(templateId, token) {
    console.log('BUSINESS CHAIN :: STARTING GETTING TEMPLATE');
    let url = new URL('https://businesschain.io/api/v1/projectProfileConstructor/getTemplate');
    url.searchParams.set('templateId', templateId);
    let response = await fetch(url.href, {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + token}
        }),
        resp = await response.json();
    console.log(
        'BUSINESS CHAIN :: GOT TEMPLATE :: ID :: ', templateId,
        ' :: BODY :: ', JSON.stringify(resp));
    return resp;
}

async function getProjectValues(acceleratorId, templateId, trackPointId, projectId, token) {
    console.log('BUSINESS CHAIN :: STARTING GETTING PROJECT VALUES');
    let url = new URL('https://businesschain.io/api/v1/projectProfileValue/getValues');
    url.searchParams.set('templateId', templateId);
    url.searchParams.set('acceleratorId', acceleratorId);
    url.searchParams.set('trackPointId', trackPointId);
    url.searchParams.set('projectId', projectId);

    let response = await fetch(url.href, {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + token}
        }),
        resp = await response.json();
    console.log(
        'BUSINESS CHAIN :: GOT PROJECT VALUES :: ID :: ', projectId,
        ' :: BODY :: ', JSON.stringify(resp));
    return resp;
}

async function getProjectData(acceleratorId, templateId, trackPointId, projectId, token) {

    function find(sectionElementId, objectId) {
        let section = values.find(s => s.sectionElementId === sectionElementId),
            value = '';
        if (section) {
            let valueObjects = section.rows.flatMap(row => row.objectValues),
                valueObj = valueObjects.find(obj => obj.objectId === objectId);
            if (valueObj) value = valueObj.strValue;
        }
        return value;
    }

    let template = await getTemplate(templateId, token),
        values = await getProjectValues(acceleratorId, templateId, trackPointId, projectId, token),
        result = {
            sections: template.templateSections.map(section => ({
                name: section.name,
                elements: section.sectionElements.map(elem => ({
                    name: elem.name,
                    objects: elem.elementObjects.map(obj => ({
                        name: obj.object.name,
                        value: find(elem.id, obj.object.id)
                    }))
                }))
            }))
        };
    return result;
}

async function setProjectData(acceleratorId, templateId, trackPointId, projectId, token, session, data) {
    console.log('BUSINESS CHAIN :: STARTING SETTING PROJECT VALUES');
    let url = new URL('https://businesschain.io/api/v1/projectProfileValue/saveValue');
    url.searchParams.set('templateId', templateId);
    url.searchParams.set('acceleratorId', acceleratorId);
    url.searchParams.set('trackPointId', trackPointId);
    url.searchParams.set('projectId', projectId);
    let body = JSON.stringify(data);
    let response = await fetch(url.href, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Content-Length': (new TextEncoder().encode(body)).length,
                "Session-Id": session,
                "Accelerator-Id": acceleratorId
            },
            body
        }),
        resp = await response.json();
    console.log(
        'BUSINESS CHAIN :: SET PROJECT VALUES RESULT :: ID :: ', projectId,
        ' :: BODY :: ', JSON.stringify(resp));
    return resp;
}

module.exports.login = login;
module.exports.get = getProjectData;
module.exports.set = setProjectData;