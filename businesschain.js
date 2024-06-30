const fetch = require("node-fetch");

let creds;

function init(email, password) {


    async function getTemplate(templateId) {
        if (!creds) creds = await login(email, password);
        console.log('BUSINESS CHAIN :: STARTING GETTING TEMPLATE');
        let url = new URL('https://businesschain.io/api/v1/projectProfileConstructor/getTemplate');
        url.searchParams.set('templateId', templateId);
        let response = await fetch(url.href, {
                method: 'GET',
                headers: {'Authorization': 'Bearer ' + creds.token}
            }),
            resp = await response.json();
        console.log(
            'BUSINESS CHAIN :: GOT TEMPLATE :: ID :: ', templateId,
            ' :: BODY :: ', JSON.stringify(resp));
        return resp;
    }

    async function getPrettyTemplate(templateId) {
        let template = await getTemplate(templateId),
            result = {
                sections: template.templateSections.map(section => ({
                    id: section.id,
                    name: section.name,
                    elements: section.sectionElements.map(elem => ({
                        id: elem.id,
                        name: elem.name,
                        type: elem.type,
                        objects: elem.elementObjects.map(obj => ({
                            id: obj.object.id,
                            code: obj.object.code,
                            type: obj.object.type,
                            name: obj.object.name,
                            desc: obj.object.description
                        }))
                    }))
                }))
            };
        return result;
    }

    async function getProjectValues(acceleratorId, templateId, trackPointId, projectId) {
        if (!creds) creds = await login(email, password);
        console.log('BUSINESS CHAIN :: STARTING GETTING PROJECT VALUES');
        let url = new URL('https://businesschain.io/api/v1/projectProfileValue/getValues');
        url.searchParams.set('templateId', templateId);
        url.searchParams.set('acceleratorId', acceleratorId);
        url.searchParams.set('trackPointId', trackPointId);
        url.searchParams.set('projectId', projectId);

        let response = await fetch(url.href, {
                method: 'GET',
                headers: {'Authorization': 'Bearer ' + creds.token}
            }),
            resp = await response.json();
        console.log(
            'BUSINESS CHAIN :: GOT PROJECT VALUES :: ID :: ', projectId,
            ' :: BODY :: ', JSON.stringify(resp));
        return resp;
    }

    async function getProjectData(acceleratorId, templateId, trackPointId, projectId) {

        function find(valueObjects = [], objectId) {
            let value = '', valueObj = valueObjects.find(obj => obj.objectId === objectId);
            if (valueObj) value = valueObj.strValue;
            return value;
        }

        function getRows(elementObjects = [], elementId) {
            let section = values.find(s => s.sectionElementId === elementId),
                rows = [];
            if (section) {
                section.rows.forEach(row => {
                    rows.push(elementObjects.map(obj => ({
                        id: obj.object.id,
                        name: obj.object.name,
                        code: obj.object.code,
                        value: find(row.objectValues, obj.object.id)
                    })))
                })
            }
            return rows;
        }

        let template = await getTemplate(templateId),
            values = await getProjectValues(acceleratorId, templateId, trackPointId, projectId),
            result = {
                sections: template.templateSections.map(section => ({
                    name: section.name,
                    elements: section.sectionElements.map(elem => ({
                        id: elem.id,
                        name: elem.name,
                        type: elem.type,
                        rows: getRows(elem.elementObjects, elem.id)
                    }))
                }))
            };
        return result;
    }

    async function getProjectData_(acceleratorId, templateId, trackPointId, projectId) {

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

        let template = await getTemplate(templateId),
            values = await getProjectValues(acceleratorId, templateId, trackPointId, projectId),
            result = {
                sections: template.templateSections.map(section => ({
                    name: section.name,
                    elements: section.sectionElements.map(elem => ({
                        id: elem.id,
                        name: elem.name,
                        type: elem.type,
                        objects: elem.elementObjects.map(obj => ({
                            name: obj.object.name,
                            value: find(elem.id, obj.object.id)
                        }))
                    }))
                }))
            };
        return result;
    }

    async function setProjectData(acceleratorId, templateId, trackPointId, projectId, data) {
        console.log('BUSINESS CHAIN :: STARTING SETTING PROJECT VALUES');
        if (!creds) creds = await login(email, password);
        let url = new URL('https://businesschain.io/api/v1/projectProfileValue/saveValue');
        url.searchParams.set('templateId', templateId);
        url.searchParams.set('acceleratorId', acceleratorId);
        url.searchParams.set('trackPointId', trackPointId);
        url.searchParams.set('projectId', projectId);
        let body = JSON.stringify(data);
        let response = await fetch(url.href, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + creds.token,
                    'Content-Type': 'application/json',
                    'Content-Length': (new TextEncoder().encode(body)).length,
                    "Session-Id": creds.session,
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
    
    async function reLogin(email, password) {
        creds = await login(email, password);
        return creds;
    }
    
    async function createProject(projectName) {
        console.log('BUSINESS CHAIN :: CREATING PROJECT :: ', projectName);
        if (!creds) creds = await login(email, password);
        let body = JSON.stringify({projectName}),
            response = await fetch('https://businesschain.io/api/v1/project-manager/create-project', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + creds.token,
                    'Content-Type': 'application/json',
                    //'Content-Length': (new TextEncoder().encode(body)).length
                },
                body
            });
        console.log('BUSINESS CHAIN :: CREATING PROJECT :: RESULT :: RAW :: ', JSON.stringify(response));
        let resp = await response.json();
        console.log('BUSINESS CHAIN :: CREATING PROJECT :: RESULT :: JSON :: ', JSON.stringify(resp));
        return Number(resp);
    }

    /**
     * Постановка проекта на трек, где стоит автоматический акцепт проектов
     * @param projectId
     * @param trackId
     * @returns {Promise<number>}
     */
    async function applyProjectToTrackAuto(projectId, trackId) {
        console.log('BUSINESS CHAIN :: APPLYING PROJECT TO TRACK AUTO :: ', projectId, trackId);
        if (!creds) creds = await login(email, password);
        let body = JSON.stringify({projectId, trackId}),
            response = await fetch('https://businesschain.io/api/v1/project-acceleration/create', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + creds.token,
                    'Content-Type': 'application/json',
                    //'Content-Length': (new TextEncoder().encode(body)).length
                },
                body
            }),
            resp = await response.text();
        return Number(resp);
    }

    getProjectData.values = getProjectValues;

    return {
        login: reLogin,
        getTemplate: getPrettyTemplate,
        get: getProjectData,
        set: setProjectData,
        create: createProject,
        applyProjectToTrack: applyProjectToTrackAuto
    }
}

async function login(email, password) {
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
    let body = JSON.stringify({login: email, password, ldap:false});
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
    creds = {token: resp.access_token, session};
    return creds;
}

module.exports = init;
/*
module.exports.get = getProjectData;
module.exports.getTemplate = getPrettyTemplate;
module.exports.set = setProjectData;*/
