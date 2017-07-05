import 'whatwg-fetch';
import moment from 'moment';

export default function sendRequest(api, method, params, result) {
  let headers;
  let body;

  // Construct a request from the params. This depends on the HTTP method.
  if (params) {
    if (method === 'GET') {
      // GET requires a list of `?name1=value1&name2=value`.
      var query = '?';
      for (const key in params) {
        const value = params[key];
        if (value === undefined) {
          continue;
        }

        let stringValue;

        const dateValue = moment(value, moment.ISO_8601);
        if (value instanceof Date) {
          stringValue = value.toISOString();
        } else if (dateValue.isValid()) {
          stringValue = dateValue.toISOString();
        } else {
          stringValue = value;
        }

        query += `${key}=${stringValue}&`;
      }

      api += query;
    } else if (method === 'POST' || method === 'PATCH') {
      // POST and PATCH require a JSON encoded body.
      body = JSON.stringify(params);
      headers = {'Content-Type': 'application/json'};
    }
  }

  const download = (response, name) => {
    return response.blob().then(blob => {
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = url;
      a.download = name;
      a.click();

      window.URL.revokeObjectURL(url);
    });
  };

  return fetch(api, {method, headers, body})
    .then(response => {
      // Status Code 200 indicates success.
      if (response.status !== 200) {
        if (response.status === 400) {
          return response.text().then(errorMessage => result(null, errorMessage));
        }
  
        throw new Error(`Invalid status code ${response.status} returned from the backend.`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType) {
        result(null, null);
      } else if (contentType.indexOf('text/csv') !== -1) {
        download(response, 'export.csv');
      } else if (contentType.indexOf('application/json-download') !== -1) {
        download(response, 'export.json');
      } else if (contentType.indexOf('application/json') !== -1) {
        return response.json().then(json => result(json, null));
      } else if (contentType.indexOf('text/plain') !== -1) {
        return response.text().then(text => result(text, null));
      } else {
        throw new Error(`Invalid content type ${contentType} returned from the backend.`);
      }
    }).catch(error => {
      const errorMessage = `${error.message || 'Fatal Error'}\n${error.stack}`;
      result(null, errorMessage);
    });
};