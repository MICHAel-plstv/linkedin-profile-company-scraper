## Installation

```bash
npm i linkedin-profile-company-scraper
```

```js
const Lnkdn = require('linkedin-profile-company-scraper');

(async () => {
  const client = new Lnkdn('YOUR_LINKEDIN_COOKIE');
  const data = await client.fetch('https://www.linkedin.com/in/mchl-plstv/');
  console.log(data);
})();
```

## CLI usage

If you want to retrieve people details :

```bash
node src/cli.js https://www.linkedin.com/in/mchl-plstv/
```

Or if you want to retrieve company information :

```bash
node src/cli.js https://www.linkedin.com/company/apple/
```

## Web interface

If you want to run the web interface on you own, you can do as follows :

```bash
git clone https://github.com/Cooya/Linkedin-Client.git linkedin-client
cd linkedin-client
npm install
npm run build
echo "module.exports = { cookie: 'YOUR_LINKEDIN_COOKIE' };" > config.js
npm start
```
