## Sample Consent Receipt (CR) editor React app

Introduction
-----------------------
This sample application demonstrates generating, viewing, signing and storing consent receipts.



Features
-----------------------
This sample application demonstrates generating, viewing, signing and storing consent receipts.

* Structured data: 
    * JSON schema - defines structure of CR,
    * UI schema - defines labels and controls available on CR generating form,
    * Form data - actual CR data; 
* visual JSON editor to manipulate JSON schema & UI schema,
* visual presentation of JSON structures,
* ability to define CR generation form options in schemas,
* ability to define CR contents from a template - a Project configuration file,
* client-side encoding JWT (via RS256 and HS256 algorithm),
* client-side decoding JWT (by RS256 and HS256 algorithm), 
* human-readable presentation of decoded JWT with **consent-viewer** module <https://www.npmjs.com/package/@datafund/consent-viewer> 
* ability to download JWT as file,
* verifying JWT's validity
 

Installation guide
-----------------------

#### `npm install`

Installs dependencies for the project. You might need to use `sudo`.

#### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.
