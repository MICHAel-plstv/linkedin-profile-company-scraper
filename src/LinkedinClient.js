const cheerio = require('cheerio');
const fs = require('fs');
const Entities = require('html-entities').XmlEntities;
const request = require('node-fetch');

const debugFile = './assets/debug.json';
const currentIndustries = {};
const industries = [];
const followingItems = {};
const employTypes = {};

module.exports = class LinkedinClient {
	constructor(cookie) {
		if (!cookie)
			throw new Error('The Linkedin cookie is required.');

		this.entities = new Entities();
		this.cookie = cookie;
	}

	async fetch(url) {
		let processMethod;
		if (url.match(/^https:\/\/www.linkedin.com\/in\//)) processMethod = processPeopleProfile;
		else if (url.match(/^https:\/\/www.linkedin.com\/company\//)) {
			url += url[url.length - 1] === '/' ? 'about/' : '/about/';
			processMethod = processCompanyPage;
		} else throw new Error(`Invalid URL provided ("${url}"), it must be a people profile URL or a company page URL.`);

		if (process.env.NODE_ENV === 'dev')
			fs.writeFileSync(debugFile, '');

		const res = await request(url, { headers: { Cookie: `li_at=${this.cookie}` } });
		const html = await res.text();
		// if (html) {
		// 	var stream = fs.createWriteStream('output.html', { flags: 'a' });
		// 	stream.write(html, function () {
		// 		var html1 = buildHtml();
		// 		stream.end(html1);
		// 	})
		// };

		const $ = cheerio.load(html);
		let data, result = { linkedinUrl: url.replace('/about/', '') };
		while (!result.name && !result.firstName) {
			// this loop allows to fix a bug with random missing <code> tags
			for (const [index, elt] of ($('code').get()).entries()) {
				try {
					data = JSON.parse(this.entities.decode($(elt).html()));
				} catch (e) {
					continue;
				}

				if (!data.included)
					continue;
				for (let item of data.included) {
					processMethod(item, result);
					if (process.env.NODE_ENV === 'dev')
						fs.appendFileSync(debugFile, JSON.stringify(item, null, 4) + '\n');
				}
			}
			// this company or people does not exist
			if (!result.firstName && !result.name)
				return null;
		}
		return result;
	}
};

// private method
function processPeopleProfile(item, result) {
	if (item.$type === 'com.linkedin.voyager.dash.common.Industry' && item.name) {
		currentIndustries[item.entityUrn] = item.name;
		industries.push(item.name);
	} else if (item.$type === 'com.linkedin.voyager.dash.identity.profile.Profile' && item.objectUrn) {
		result.firstName = item.firstName;
		result.lastName = item.lastName;
		result.headline = item.headline;
		result.location = item.locationName;
		result.multiLocaleLastName = item.multiLocaleLastName;
		result.multiLocaleFirstName = item.multiLocaleFirstName;
		result.multiLocaleHeadline = item.multiLocaleHeadline;
		result.supportedLocales = item.supportedLocales?.map(item => ({"country": item.country, "language": item.language}));
		result.id = item.publicIdentifier;
		result.trackingId = item.trackingId;
		result.address = item.address;
		result.industry = currentIndustries[item['*industry']];
		result.industriesList = industries;
		result.summary = item.summary;
		if (result.birthDateOn) {
			result.birthDate = item.birthDateOn;
		}
		if (result.birthDate) {
			result.birthDate = item.birthDate;
			delete result.birthDate.$type;
		}
	} else if (item.$type === 'com.linkedin.voyager.dash.common.Geo' && item.defaultLocalizedNameWithoutCountryName) {
		const [region, city, country] = item.defaultLocalizedName.split(',');
		result.geo = {
			region: region?.trim(), city: city?.trim(), country: country?.trim()
		}
	} else if (item.$type === 'com.linkedin.voyager.common.FollowingInfo' && item.followerCount) {
		result.connections = item.followerCount;
	} else if (item.$type === 'com.linkedin.voyager.dash.identity.profile.Position' && item.dateRange) {
		if (!result.positions) {
			result.positions = [];
		};

		const position = {
			title: item.title,
			company: item.companyName,
			location: item.locationName,
			description: item.description,
			dateRange: item.dateRange,
			multiLocaleCompany: item.multiLocaleCompanyName,
			multiLocaleLocation: item.multiLocaleLocationName,
			multiLocaleDescription: item.multiLocaleDescription,
			employTypes: employTypes[item.employmentTypeUrn]
		};

		if (position.dateRange) {
			delete position.dateRange.$type;
			delete position.dateRange.$recipeTypes;
			if (position.dateRange.start) {
				delete position.dateRange.start.$type;
				delete position.dateRange.start.$recipeTypes;
			}
			if (position.dateRange.end) {
				delete position.dateRange.end.$type;
				delete position.dateRange.end.$recipeTypes;
			}
		};

		result.positions.push(position);
	} else if (item.$type === 'com.linkedin.voyager.dash.identity.profile.EmploymentType') {
		employTypes[item.entityUrn] = item.name;
	} else if (item.$type === 'com.linkedin.voyager.dash.identity.profile.Education' && item.dateRange) {
		if (!result.education) {
			result.education = [];
		}

		const degree = {
			degree: item.degreeName,
			description: item.description,
			school: item.schoolName,
			field: item.fieldOfStudy,
			dateRange: item.dateRange,
			multiLocaleSchoolName: item.multiLocaleSchoolName,
			multiLocaleFieldOfStudy: item.multiLocaleFieldOfStudy,
			multiLocaleDegreeName: item.multiLocaleDegreeName,
		};

		if (degree.dateRange) {
			delete degree.dateRange.$type;
			delete degree.dateRange.$recipeTypes;
			if (degree.dateRange.start) {
				delete degree.dateRange.start.$type;
				delete degree.dateRange.start.$recipeTypes;
			}
			if (degree.dateRange.end) {
				delete degree.dateRange.end.$type;
				delete degree.dateRange.end.$recipeTypes;
			}
		};

		result.education.push(degree);
	} else if (item.$type === 'com.linkedin.voyager.dash.identity.profile.Skill') {
		if (!result.skills) {
			result.skills = [];
		}
		result.skills.push(item.name);
	} else if (item.$type === 'com.linkedin.voyager.dash.identity.profile.Language') {
		if (!result.languages) {
			result.languages = [];
		}

		result.languages.push({ language: item.name, proficiency: item.proficiency });
	}
}

// private method
function processCompanyPage(item, result) {
	if (item.$type === 'com.linkedin.voyager.common.Industry') {
		industries[item.entityUrn] = item.localizedName;
	}	else if (item.$type === 'com.linkedin.voyager.common.FollowingInfo') {
		followingItems[item.entityUrn] = item.followerCount;
	}	else if (item.$type === 'com.linkedin.voyager.organization.Company' && item.staffCount) {
		result.name = item.name;
		result.universalName = item.universalName;
		result.tagline = item.tagline;
		result.description = item.description;
		result.industry = industries[item['*companyIndustries'][0]];
		result.type = item.companyType ? item.companyType.localizedName : null;
		result.website = item.companyPageUrl;
		result.companySize = {"start": item?.staffCountRange?.start, 'end': item?.staffCountRange?.end};
		result.membersOnLinkedin = item.staffCount;
		result.headquarters = item.headquarter;
		result.companyType = item.companyType.localizedName;
		result.foundedYear = item.foundedOn?.year;
		result.specialties = item.specialities;
		result.followers = followingItems[item[['*followingInfo']]];
		result.phone = item?.phone;
		result.linkedinUrl = item?.url;

		if (result.headquarters) {
			delete result.headquarters.$type;
		}
	} else if (item["$recipeTypes"]?.includes('com.linkedin.voyager.dash.deco.organization.CompanyStockQuote')) {
		result.stock = {
			'stockExchange': item.stockQuote?.stockExchange,
			'stockSymbol': item.stockQuote?.stockSymbol,
			'currency': item.stockQuote?.currency,
		}
	}
}
