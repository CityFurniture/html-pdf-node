const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const inlineCss = require('inline-css');
const Promise = require('bluebird');

const DEFAULT_PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
];
/**
 * private function that launches a puppeteer browser. 
 * @param {*} customArgs 
 * @returns 
 */
async function _launchBrowser(customArgs = []) {
  const args = customArgs.length > 0 ? customArgs : DEFAULT_PUPPETEER_ARGS;
  return puppeteer.launch({ args });
}
/**
 * private function that compiles the template with handlebars.
 * @param {*} content 
 * @returns 
 */
async function _compileTemplate(content) {
  console.log("Compiling the template with handlebars");
  const styledContent = await inlineCss(content, { url: "/" });
  const template = handlebars.compile(styledContent, { strict: true });
  return template(styledContent);
}
/**
 * private function that sets the pdf content.
 * @param {*} page
 * @param {*} file
 * @returns
 *  */
async function _setPdfContent(page, file) {
  if (file.content) {
    const html = await _compileTemplate(file.content);
    await page.setContent(html, { waitUntil: 'networkidle0' });
  } else {
    await page.goto(file.url, { waitUntil: ['load', 'networkidle0'] });
  }
}

/**
 * This function closes all pages in the browser. It is used to avoid memory leaks. 
 * @param {puppeteer.Puppeteer.browser} browser 
*/
async function _closeAllPages(browser) {
  const pages = await browser.pages();
  await Promise.all(pages.map(page => page.close()));
}


/**
 * Generates a pdf from a file. 
 * @param {*} file 
 * @param {*} options 
 * @param {callback} callback 
 * @returns 
 */
async function generatePdf(file, options, callback) {
  const browser = await _launchBrowser(options.args);
  try {
    delete options.args;

    const page = await browser.newPage();
    await _setPdfContent(page, file);

    const buffer = await page.pdf(options);
    const result = Buffer.from(Object.values(buffer));
    return Promise.resolve(result).asCallback(callback);
  } catch (error) {
    return Promise.reject(error).asCallback(callback);
  } finally {
    await _closeAllPages(browser);
    await browser.close();
  }
}
/**
 * Generates an array of pdfs from an array of files. 
 * @param {*} files 
 * @param {*} options 
 * @param {callback} callback 
 * @returns 
 */
async function generatePdfs(files, options, callback) {
  const browser = await _launchBrowser(options.args);
  try {
    delete options.args;

    const page = await browser.newPage();
    const pdfs = [];

    for (const file of files) {
      await _setPdfContent(page, file);
      const buffer = await page.pdf(options);
      pdfs.push({
        ...file,
        buffer: Buffer.from(Object.values(buffer))
      });
    }

    return Promise.resolve(pdfs).asCallback(callback);
  } catch (error) {
    return Promise.reject(error).asCallback(callback);
  } finally {
    await _closeAllPages(browser);
    await browser.close();
  }
}


module.exports = {
  generatePdf,
  generatePdfs
};
