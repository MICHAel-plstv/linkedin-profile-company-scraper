## Installation

```bash
npm i linkedin-profile-company-scraper
```

```js
const Lnkdn = require("linkedin-profile-company-scraper");

(async () => {
  const client = new Lnkdn("YOUR_LINKEDIN_COOKIE");
  const data = await client.fetch("https://www.linkedin.com/in/mchl-plstv/");
  console.log(data);
})();
```

## Web interface

If you want to run the web interface on you own, you can do as follows :

```bash
git clone https://github.com/Cooya/Linkedin-Client.git linkedin-client
cd linkedin-client
yarn (npm install)
yarn build (npm run build)
echo "module.exports = { cookie: 'YOUR_LINKEDIN_COOKIE' };" > config.json
yarn start (npm start)
```
