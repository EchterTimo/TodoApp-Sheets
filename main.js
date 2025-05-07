// this is a Google Apps Script

// the spreadsheet has the colummns: id, name, description, status

const SPREADSHEET_ID = '15yWW81VpWqS49coSdrYab46NbGhDAGbBgPHs9p8m0EM';
const DATA_SHEET_NAME = 'tasks'
const AUTH_SHEET_NAME = 'auth'

// enumerate the possible statuses
const STATUSES = {
    0: 'TODO',
    1: 'IN_PROGRESS',
    2: 'DONE'
};

function get_data_sheet() {
    // docs: https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(DATA_SHEET_NAME);
    return sheet;
}

function get_auth_pw() {
    // the password is stored in A1
    // docs: https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(AUTH_SHEET_NAME);
    const data = sheet.getRange('A1').getValue();
    return data;
}

function build_response(status, message, data) {
    return ContentService.createTextOutput(JSON.stringify({
        status: status,
        message: message,
        data: data
    })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
    // allowed actions:
    // read (all or by id)
    // create (name, description)
    // update (by id)
    // delete (by id)

    // get data from the request
    let pw = e.parameter.pw || null;
    let action = e.parameter.action;

    // authenticate the request
    if (pw != get_auth_pw()) {
        return build_response(401, 'Unauthorized', null);
    }

    let id = e.parameter.id || null;
    let name = e.parameter.name || null;
    let description = e.parameter.description || null;
    let status = e.parameter.status || null;

    switch (action) {
        case 'read':
            return read(id);
        case 'create':
            return create(name, description, status);
        case 'update':
            return update(id, name, description, status);
        case 'delete':
            return delete_task(id);
        default:
            return build_response(405, 'Invalid action', null);
    }
}

function read(id) {
    const sheet = get_data_sheet();
    const data = sheet.getDataRange().getValues();
    let result = [];

    if (id) {
        // find the task by id
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] == id) {
                result.push({
                    id: data[i][0],
                    name: data[i][1],
                    description: data[i][2],
                    status: data[i][3]
                });
                break;
            }
        }
        if (id && result.length === 0) {
            return build_response(404, 'Task not found', null);
        }
    } else {
        // return all tasks
        for (let i = 1; i < data.length; i++) {
            result.push({
                id: data[i][0],
                name: data[i][1],
                description: data[i][2],
                status: data[i][3]
            });
        }
    }

    return build_response(200, 'Tasks retrieved', result);
}

function create(name, description, status) {
    const sheet = get_data_sheet();

    if (!name || !description) {
        return build_response(400, 'Name and description are required', null);
    }

    // docs: https://developers.google.com/apps-script/reference/utilities/utilities#getuuid
    const id = Utilities.getUuid();
    let taskStatus = STATUSES[status] || STATUSES[0]; // default to TODO

    // add the new task to the sheet
    sheet.appendRow([id, name, description, taskStatus]);

    return build_response(201, 'Task created', {
        id: id,
        name: name,
        description: description,
        status: taskStatus
    });
}

function update(id, name, description, status) {
    // change only the given data
    const sheet = get_data_sheet();
    const data = sheet.getDataRange().getValues();

    if (!id) {
        return build_response(400, 'ID is required', null);
    }

    // find the task by id
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) {
            if (name) data[i][1] = name;
            if (description) data[i][2] = description;
            if (status) data[i][3] = STATUSES[status] || STATUSES[0]; // default to TODO

            // update the task in the sheet
            sheet.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
            return build_response(200, 'Task updated', data[i]);
        }
    }

    return build_response(404, 'Task not found', null);
}

function delete_task(id) {
    const sheet = get_data_sheet();
    const data = sheet.getDataRange().getValues();

    if (!id) {
        return build_response(400, 'ID is required', null);
    }

    // find the task by id
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) {
            // delete the task from the sheet
            sheet.deleteRow(i + 1);
            return build_response(200, 'Task deleted', null);
        }
    }

    return build_response(404, 'Task not found', null);
}

function test() {
    let get_pw = get_auth_pw();
    console.log(get_pw); // should print the password stored in A1 of the auth sheet
}

test();