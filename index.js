const http = require('http');
const fs = require('fs');
const path = require('path');

const request = require('request');
const cheerio = require('cheerio');

const PORT = 3000;

let currentFilename = '';

const getPageThree = (callback, finish) => {
  request(
    `https://auto.ria.com/uk/search/?category_id=1&marka_id=2233&model_id=0&city%5B0%5D=0&state%5B0%5D=0&s_yers%5B0%5D=0&po_yers%5B0%5D=0&price_ot=&price_do=`,
    function (error, response, body) {
    callback(body, finish);
  });
};

const getFormattedDate = () => {
  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1 < 10
    ? '0' + currentDate.getMonth() + 1
    : currentDate.getMonth() + 1;
  const day = currentDate.getDay() + 1 < 10
    ? '0' + currentDate.getDay() + 1
    : currentDate.getDay() + 1;
  const hours = currentDate.getHours() < 10
    ? '0' + currentDate.getHours()
    : currentDate.getHours();
  const minutes = currentDate.getMinutes() < 10
    ? '0' + currentDate.getMinutes()
    : currentDate.getMinutes()
  const seconds = currentDate.getSeconds() < 10
    ? '0' + currentDate.getSeconds()
    : currentDate.getSeconds();

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

const parseData = (data) => {
  let res = '';

  data.forEach((item, i) => {
    res += ` ${item.title} ${item.year} ${item.costUSD} ${item.costUAH} \n`;
  })

  return res;
};

const removeFile = (data, callback, filename) => {
  if (
    currentFilename.length
  ) {
    fs.unlink(
      path.join(__dirname, '/csvs', currentFilename), err => {
        if (
          err
        ) {
          callback(data, filename);
          throw err;
        } else {
          callback(data, filename);
        }
      }
    );
  } else {
    callback(data, filename);
  }
}

const writeFile = (data, filename) => {
  currentFilename = filename + '_' + getFormattedDate() + '.csv';

  fs.writeFile(
    path.join(__dirname, '/csvs', currentFilename), parseData(data), err => {
      if (
        err
      ) {
        throw err;
      }
    }
  );
}

const writeCsvData = (filename, data) => {
  removeFile(data, writeFile, filename);
}

const getTemplate = (data) => {
  const tableHead = '<tr><td>Name</td><td>Year</td><td>Price(USD)</td><td>Price(UAH)</td></tr>';
  const tableBody = data.map(
    item => `<tr><td>${item.title}</td><td>${item.year}</td><td>${item.costUSD}</td><td>${item.costUAH}</td></tr>`
  ).join('');
  return `<table>${tableHead}${tableBody}</table>`;
}

const getData = (page, finish) => {
  const data = [];
  const $ = cheerio.load(page);

  $('section.ticket-item div.content').each((i, item) => {
    let title;
    let year;
    let costUSD;
    let costUAH;
    try {
      title = $(item).find('span.blue').html();
    } catch (e) {
      title = 'Is not a car :('
    }
    try {
      year = $(item).find('a.address')
        .text()
        .trim()
        .match(/\d{4}$/gi)[0]
    } catch (e) {
      year = '2020';
    }
    try {
      costUSD =
        parseInt(
          $(item)
            .find('div.price-ticket span.green')
            .text()
            .replace(/\s/gi, ''),
          10
        );
    } catch (e) {
      costUSD = 20000000;
    }
    try {
      costUAH =
        parseInt(
        $(item)
          .find('div.price-ticket span.i-block span')
          .text()
          .replace(/\s/gi, ''),
          10
        );
    } catch (e) {
      costUAH = 2000000000;
    }

    data.push({
      title,
      year,
      costUSD,
      costUAH
    });
  });

  finish(getTemplate(data));
  writeCsvData('csv', data);
}

const server = http.createServer((req, res) => {
  if (
    req.method === 'GET'
  ) {
    res.writeHead(200, {
      'Content-Type': 'text/html'
    });

    let content = `
      <style>
      @import url("https://fonts.googleapis.com/css2?family=Ubuntu:wght@500;700&display=swap");
        body {
          overflow: hidden;
          margin: 80px 0 0 0;
        }
        * {
          font-family: Ubuntu, sans-serif;
        }
        .link {
          border: 2px solid #000;
          background: none;
          text-decoration: none;
          border-radius: 6px;
          width: 240px;
          height: 60px;
          margin: 0 auto 40px auto;
          font-size: 18px;
          font-weight: bold;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #000;
        }

        .link:active {
          background: #f8f8f8;
        }

        table {
          width: 750px;
          border-collapse: collapse;
          border-color: #000;
          border-width: 2px;
          margin: 0 auto 80px auto;
        }
      </style>
      <a href="/tesla" class="link">Update data about Tesla</a>
    `;
    if (
      req.url === '/tesla'
    ) {
      getPageThree(getData, (template) => {
        content += template;
        res.end(content);
      });
    } else {
      res.end(content);
    }
  }
});

server.listen(PORT, () => {
  console.log('server is running on port ' + PORT + '...')
});
