/**
 * Datafund Consent generator & viewer
 * Licensed under the MIT license
 * Created by Markus Zevnik, Tadej Fius, �rt Ahlin
 */

import React, {Component} from 'react';
import {
    Collapse,
    Navbar,
    NavItem,
    ListGroup,
    ListGroupItem,
    ListGroupItemHeading,
    ButtonGroup,
    Button,
    Nav,
    TabContent,
    TabPane,
    NavLink
} from 'reactstrap'

import Form from "react-jsonschema-form-bs4";
import JSONPretty from "react-json-pretty";
import _ from "lodash";
import jwt from "jsonwebtoken";
import uuidv4 from "uuid/v4";
import {JsonEditor} from 'jsoneditor-react';
import exportFromJSON from 'export-from-json'
import classnames from 'classnames';
import fileDownload from 'js-file-download';
import Loader from "react-loader-advanced";
import config from "../projectConfiguration";
import {ConsentViewer as ConsentViewer} from "@datafund/consent-viewer";
import DataReceipt from "@datafund/data-receipt";


const log = (type) => console.log.bind(console, type);
let reactJsonSchemaForm;

class CrEditorViewer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpen: false,
            schema: config.schema,
            uiSchema: config.uiSchema,
            formData: config.formData,
            defaultProperties: config.defaultProperties,
            cleanFormData: {},
            jwtToken: {},
            jwtTokenDecoded: {},
            schemaVisible: false,
            uiSchemaVisible: false,
            formDataVisible: false,
            encodeJwtVisible: false,
            jwtTokenEncodedVisible: false,
            jwtTokenDecodedVisible: false,
            projectConfigurationVisible: false,
            activeMainTab: '1',
            activeSchemaTab: '1',
            uiSchemaTab: '1',
            formDataTab: '1',
            algorithmTab: '1',
            projectConfigurationTab: '1',
            loadingInProgress: false,
            mode: 'editor',
            secret: '',
            privateKey: '',
            signature: {}
        };

        this.onClean = this.onClean.bind(this);
        this.generateJwtHS256 = this.generateJwtHS256.bind(this);
        this.generateJwtRS256 = this.generateJwtRS256.bind(this);
        this.decodeJwt = this.decodeJwt.bind(this);
        this.verifyJwtHS256 = this.verifyJwtHS256.bind(this);
        this.verifyJwtRS256 = this.verifyJwtRS256.bind(this);

        this.onFormDataChange = this.onFormDataChange.bind(this);
        this.onSchemaChange = this.onSchemaChange.bind(this);
        this.onDefaultPropertiesChange = this.onDefaultPropertiesChange.bind(this);
        this.onUiSchemaChange = this.onUiSchemaChange.bind(this);

        this.downloadJwt = this.downloadJwt.bind(this);
        this.downloadProjectConfigFile = this.downloadProjectConfigFile.bind(this);
        this.onInputFileChange = this.onInputFileChange.bind(this);
        this.readDefaultProperties = this.readDefaultProperties.bind(this);
        this.onPrivateKeyChange = this.onPrivateKeyChange.bind(this);
    }

    componentDidMount() {
        const _this = this;


        //document.getElementsByClassName("mainContent")[0].classList.replace('container-fluid', 'container');

        console.log(DataReceipt);

        setTimeout(function () {
            _this.readDefaultProperties();
            _this.generateUUID();
        }, 100);

    }

    generateUUID() {
        const _this = this;

        if (!_this.state.formData.consentReceiptID || _this.state.formData.consentReceiptID === '') {
            _this.state.formData.consentReceiptID = uuidv4();
            _this.forceUpdate();
        }
    }

    readDefaultProperties() {
        const _this = this;

        _this.setState({loadingInProgress: true});

        _.each(_this.state.defaultProperties, function (val, key) {

            if (_this.state.schema.properties[key]) {
                if (_this.state.schema.properties[key].default) {
                    delete _this.state.schema.properties[key].default;
                }
                _.assign(_this.state.schema.properties[key], {"default": val});
                _this.state.formData[key] = val;
            }

            _this.forceUpdate();
            console.log("val ", val);
            console.log("key ", key);
            console.log("_this.state.formData", _this.state.formData);

        });

        _this.setState({loadingInProgress: false});
        //_this.forceUpdate();
    }

    onFormDataChange(val) {
        const _this = this;
        console.log("onFormDataChange", val);
        //
        _this.setState({
            formData: val.formData
        })
    }

    onPrivateKeyChange(val) {
        const _this = this;
        console.log("onChange", val);
        //
        _this.setState({
            privateKey: val
        });
    }

    onInputFileChange(e) {
        const _this = this;

        if (window.FileReader) {

            _this.setState({loadingInProgress: true});

            let file = e.target.files[0]
            let reader = new FileReader();

            if (file) {
                reader.onload = function (r) {
                    console.log(r.target.result);
                    console.log(r.target.result.substr(29));
                    console.log(window.atob(r.target.result.substr(29)));

                    let importedData = JSON.parse(window.atob(r.target.result.substr(29)));

                    console.log(importedData);

                    _this.state.schema = importedData.schema;
                    _this.state.uiSchema = importedData.uiSchema;
                    _this.state.formData = importedData.formData;
                    _this.state.defaultProperties = importedData.defaultProperties;

                    _this.forceUpdate();

                    setTimeout(function () {
                        _this.readDefaultProperties();
                    }, 1000);


                    _this.setState({loadingInProgress: false});
                }


                reader.readAsDataURL(file);
                console.log(reader);
                console.log(file);
            } else {
                _this.setState({loadingInProgress: false});
                alert("Could not upload configuration because configuration file was not selected!");
            }
        } else {
            alert('Sorry, your browser doesn\'t support for preview');
        }
    }


    onClean(obj) {
        const _this = this;

        Object.keys(obj).forEach(function (key) {
            if (obj[key] && typeof obj[key] === 'object') _this.onClean(obj[key])
            else if (obj[key] == null) delete obj[key]
        });

        console.log(obj);
        _this.state.cleanFormData = obj;
        _this.forceUpdate();
    }

    generateJwtHS256() {
        const _this = this;

        _this.onClean(_this.state.formData);

        let jwtToken = jwt.sign(_this.state.cleanFormData, _this.state.secret);
        _this.setState({
            jwtToken: jwtToken,
            jwtTokenEncodedVisible: true,
            secret: ''
        });
        console.log(jwtToken);
    }

    generateJwtRS256() {
        const _this = this;

        _this.onClean(_this.state.formData);

        console.log("PRIVATE KEY: ", _this.state.privateKey);
        console.log(_this.state.cleanFormData);


        let jwtToken = jwt.sign(_this.state.cleanFormData, _this.state.privateKey, config.defaultProperties.tokenSigningOptions);

        _this.setState({
            jwtToken: jwtToken,
            jwtTokenEncodedVisible: true,
        });

    }

    decodeJwt() {
        const _this = this;

        let decoded = jwt.decode(_this.state.jwtToken, {complete: true});

        _this.setState({
            jwtTokenDecodedVisible: true,
            jwtTokenDecoded: decoded
        });
    }

    verifyJwtHS256() {
        const _this = this;
        console.log("_this.state.formData.publicKey ", _this.state.formData.publicKey);

        let verifyOptions = {
            algorithm: "HS256"
        };

        try {
            let legit = jwt.verify(_this.state.jwtToken, _this.state.secret, verifyOptions);
            console.log("LEGIT", legit);
            _this.setState({
                signature: legit
            });
            alert("Signature VALID!");
        } catch (e) {
            alert("Invalid signature!");
        }
    }

    verifyJwtRS256() {
        const _this = this;

        console.log("_this.state.formData.publicKey ", _this.state.formData.publicKey);

        let verifyOptions = config.defaultProperties.tokenSigningOptions;
        verifyOptions.algorithm = "RS256";

        try {
            let legit = jwt.verify(_this.state.jwtToken, _this.state.formData.publicKey, verifyOptions);

            _this.setState({
                signature: legit
            });
            alert("Signature VALID!");
        } catch (e) {
            alert("Invalid signature!");
        }

    }

    onSchemaChange(val) {
        const _this = this;
        console.log(val);
        _this.setState({
            schema: val
        });
    }

    onUiSchemaChange(val) {
        const _this = this;
        console.log(val);
        _this.setState({
            uiSchema: val
        });
    }

    onDefaultPropertiesChange(val) {
        const _this = this;
        console.log(val);
        _this.setState({
            defaultProperties: val
        });

        _this.readDefaultProperties();
    }

    // onFormDataChange(val) {
    //     console.log(val);
    // }

    downloadProjectConfigFile() {
        const _this = this;

        let data = {
            "schema": _this.state.schema,
            "uiSchema": _this.state.uiSchema,
            "formData": _this.state.formData,
            "defaultProperties": _this.state.defaultProperties
        };

        console.log("data ->", data);
        //console.log(JSON.parse(data));

        const fileName = 'CR_project_config';
        const exportType = 'json';
        exportFromJSON({data, fileName, exportType});
    }

    downloadJwt() {
        const _this = this;

        let decoded = jwt.decode(_this.state.jwtToken, {complete: true});

        fileDownload(_this.state.jwtToken, "consent_receipt_" + decoded.payload.iat + '.jwt.cr');
    }

    render() {
        const _this = this;
        const loadingText = <span><i className="mdi mdi-spin mdi-loading"></i> Loading ...</span>;

        return (
            <div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="row">
                            <div className="col-md-12">
                            <ListGroup className="mt-3 mb-3">

<ListGroupItem>
    <ListGroupItemHeading className="m-0" onClick={(e) => {
        _this.setState({projectConfigurationVisible: !_this.state.projectConfigurationVisible})
    }}><i
        className={_this.state.projectConfigurationVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> Project
        Configuration</ListGroupItemHeading>

    <Collapse isOpen={this.state.projectConfigurationVisible}>

        <small>
        <p>Project Configuration JSON file contains some general settings as well as all other JSON files nested inside it (JSON Schema, UI Schema, FormData).</p>
        <p>With forms below you can view or edit the part of the Project Configuration file with general settings.</p>
        <p>Download project to reuse it</p>
        </small>

        <div>

            <Nav tabs className="mt-4">
                <NavItem>
                    <NavLink
                        className={classnames({active: this.state.projectConfigurationTab === '1'})}
                        onClick={() => {
                            this.setState({projectConfigurationTab: '1'});
                        }}>
                        JSON
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink
                        className={classnames({active: this.state.projectConfigurationTab === '2'})}
                        onClick={() => {
                            this.setState({projectConfigurationTab: '2'});
                        }}>

                        JSON Editor
                    </NavLink>
                </NavItem>
            </Nav>
            <TabContent activeTab={this.state.projectConfigurationTab}>
                <TabPane tabId="1">

                    <JSONPretty
                        className="p-2 mt-3"
                        json={this.state.defaultProperties}
                        themeClassName="json-pretty"></JSONPretty>


                </TabPane>
                <TabPane tabId="2">

                    {!_.isEmpty(_this.state.defaultProperties, true) &&
                    <div className="mt-3">
                        <JsonEditor
                            value={_this.state.defaultProperties}
                            onChange={_this.onDefaultPropertiesChange}
                        />

                    </div>
                    }

                </TabPane>
            </TabContent>

            <div className="pt-3 pb-2">
                <a className="btn btn-primary d-inline"
                   onClick={_this.downloadProjectConfigFile}><i
                    className="fa fa-download"></i> Download Project
                    Configuration
                    File</a>
            </div>

            <hr className="mb-4"/>

            <div className="mb-3">
                <label className="btn btn-primary d-inline" htmlFor={"file"}><i
                    className="fa fa-upload"></i> Upload Project Configuration
                    File <input id="file" className="mt-4" type="file"
                                accept=".json,application/json"
                                onChange={_this.onInputFileChange} style={{
                        width: '0px',
                        height: '0px',
                        overflow: 'hidden'
                    }}/></label>
            </div>


        </div>

    </Collapse>
</ListGroupItem>


</ListGroup>


                                <ListGroup>

                                    <ListGroupItem>
                                        <ListGroupItemHeading className="m-0" onClick={(e) => {
                                            _this.setState({schemaVisible: !_this.state.schemaVisible})
                                        }}><i
                                            className={_this.state.schemaVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> JSON
                                            Schema</ListGroupItemHeading>
                                        <Collapse isOpen={_this.state.schemaVisible}>
                                            <div>

                                            <small>
                                            <p>UI Schema JSON file defines the way the Consent Receipt will be displayed on the user interface. For example, the entry form for a particual piece of data could be a selectable menu with 5 available options.</p>
                                            <p>The UI Schema is most useful in the part of the process, where a Data controler is constructing a proposal via the Consent receipt editor and needs a user friendly graphical user interface.</p>
                                            </small>

                                                <Nav tabs className="mt-4">
                                                    <NavItem>
                                                        <NavLink
                                                            className={classnames({active: this.state.activeSchemaTab === '1'})}
                                                            title="View UI Schema JSON"
                                                            onClick={() => {
                                                                this.setState({activeSchemaTab: '1'});
                                                            }}>
                                                            JSON
                                                        </NavLink>
                                                    </NavItem>
                                                    <NavItem>
                                                        <NavLink
                                                            className={classnames({active: this.state.activeSchemaTab === '2'})}
                                                            title="Edit UI Schema JSON"
                                                            onClick={() => {
                                                                this.setState({activeSchemaTab: '2'});
                                                            }}>

                                                            JSON Editor
                                                        </NavLink>
                                                    </NavItem>
                                                </Nav>
                                                <TabContent activeTab={this.state.activeSchemaTab}>
                                                    <TabPane tabId="1">

                                                        <JSONPretty
                                                            className=""
                                                            json={_this.state.schema}
                                                            themeClassName="json-pretty"></JSONPretty>


                                                    </TabPane>
                                                    <TabPane tabId="2">

                                                        {!_.isEmpty(_this.state.schema, true) &&
                                                        <div>
                                                            <JsonEditor
                                                                value={_this.state.schema}
                                                                onChange={_this.onSchemaChange}
                                                            />

                                                            {/*<a className="btn btn-primary">*/}
                                                            {/*    <i className="fa fa-check"> Confirm changes</i>*/}
                                                            {/*</a>*/}


                                                        </div>
                                                        }

                                                    </TabPane>
                                                </TabContent>


                                            </div>
                                        </Collapse>
                                    </ListGroupItem>

                                    <ListGroupItem>
                                        <ListGroupItemHeading className="m-0" onClick={(e) => {
                                            _this.setState({uiSchemaVisible: !_this.state.uiSchemaVisible})
                                        }}><i
                                            className={_this.state.uiSchemaVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> UI
                                            Schema</ListGroupItemHeading>
                                        <Collapse isOpen={this.state.uiSchemaVisible}>
                                            <div>
                                            <small>
                                            <p>UI Schema JSON file defines the way the Consent Receipt will be displayed on the user interface. For example, the entry form for a particual piece of data could be a selectable menu with 5 available options.</p>
                                            <p>The UI Schema is most useful in the part of the process, where a Data controler is constructing a proposal via the Consent receipt editor and needs a user friendly graphical user interface.</p>
                                            </small>

                                                <Nav tabs className="mt-4">
                                                    <NavItem>
                                                        <NavLink
                                                            className={classnames({active: this.state.uiSchemaTab === '1'})}
                                                            onClick={() => {
                                                                this.setState({uiSchemaTab: '1'});
                                                            }}>
                                                            JSON
                                                        </NavLink>
                                                    </NavItem>
                                                    <NavItem>
                                                        <NavLink
                                                            className={classnames({active: this.state.uiSchemaTab === '2'})}
                                                            onClick={() => {
                                                                this.setState({uiSchemaTab: '2'});
                                                            }}>

                                                            JSON Editor
                                                        </NavLink>
                                                    </NavItem>
                                                </Nav>
                                                <TabContent activeTab={this.state.uiSchemaTab}>
                                                    <TabPane tabId="1">

                                                        <JSONPretty
                                                            className=""
                                                            json={this.state.uiSchema}
                                                            themeClassName="json-pretty"></JSONPretty>


                                                    </TabPane>
                                                    <TabPane tabId="2">

                                                        {!_.isEmpty(_this.state.uiSchema, true) &&
                                                        <JsonEditor
                                                            value={_this.state.uiSchema}
                                                            onChange={_this.onUiSchemaChange}
                                                        />
                                                        }

                                                    </TabPane>
                                                </TabContent>


                                            </div>
                                        </Collapse>
                                    </ListGroupItem>

                                    <ListGroupItem>
                                        <ListGroupItemHeading className="m-0" onClick={(e) => {
                                            _this.setState({formDataVisible: !_this.state.formDataVisible})
                                        }}><i
                                            className={_this.state.formDataVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> Form
                                            Data</ListGroupItemHeading>
                                        <Collapse isOpen={this.state.formDataVisible}>
                                            <small><p>Form Data JSON contains all the actual data in the Consent Receipt. This is the part that gets saved into the Consent Receipt JSON Web Token and signed.</p>
                                            </small>
                                            <div>


                                                <JSONPretty
                                                    className="p-2 mt-3"
                                                    json={this.state.formData}
                                                    themeClassName="json-pretty"></JSONPretty>

                                            </div>
                                        </Collapse>
                                    </ListGroupItem>


                                </ListGroup>

                                <ListGroup className="mt-3">

                                    <ListGroupItem>
                                        <ListGroupItemHeading className="m-0" onClick={(e) => {
                                            _this.setState({encodeJwtVisible: !_this.state.encodeJwtVisible})
                                        }}><i
                                            className={_this.state.encodeJwtVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> Encode
                                            JWT</ListGroupItemHeading>
                                        <Collapse isOpen={this.state.encodeJwtVisible}>
                                            <div>

                                                {_.isEmpty(_this.state.formData, true) &&
                                                <em><i className="fa fa-exclamation-triangle"></i> To Encode JWT
                                                    form Data must not be empty!</em>
                                                }

                                                {!_.isEmpty(_this.state.formData, true) &&
                                                <div>
                                                    <h5 className="mt-4">Encode</h5>
                                                    <Nav tabs>

                                                        <NavItem>
                                                            <NavLink
                                                                className={classnames({active: this.state.algorithmTab === '1'})}
                                                                onClick={() => {
                                                                    this.setState({algorithmTab: '1'});
                                                                }}>
                                                                RS256
                                                            </NavLink>
                                                        </NavItem>
                                                        <NavItem>
                                                            <NavLink
                                                                className={classnames({active: this.state.algorithmTab === '2'})}
                                                                onClick={() => {
                                                                    this.setState({algorithmTab: '2'});
                                                                }}>
                                                                HS256
                                                            </NavLink>

                                                        </NavItem>
                                                    </Nav>
                                                    <TabContent activeTab={this.state.algorithmTab}
                                                                className="mt-3">

                                                        <TabPane tabId="1">

                                                            <div className="form-group"><label
                                                                htmlFor="root_version">RSA Private Key</label>
                                                                <textarea
                                                                    className="form-control d-block mb-3"
                                                                    placeholder="insert private key"
                                                                    rows={10}
                                                                    onChange={e => {
                                                                        _this.onPrivateKeyChange(e.target.value)
                                                                    }}
                                                                    defaultValue={_this.state.privateKey}></textarea>
                                                            </div>

                                                            <a className="btn btn-success text-white mt-3 mb-3"
                                                               onClick={(e) => {
                                                                   if (_this.state.privateKey === '') {
                                                                       alert("Valid private key is required!");
                                                                       return;
                                                                   }
                                                                   _this.generateJwtRS256()
                                                               }}><i className="fas fa-lock"></i> Encode JWT
                                                                (RS256)
                                                            </a>

                                                        </TabPane>

                                                        <TabPane tabId="2">

                                                            <div className="form-group"><label
                                                                htmlFor="root_version">256 bit secret</label><input
                                                                className="form-control" id="secret"
                                                                label="version" required=""
                                                                placeholder="insert secret"
                                                                type="text" onChange={e => {
                                                                _this.setState({secret: e.target.value});
                                                            }}/></div>


                                                            <a className="btn btn-success text-white mt-3 mb-3"
                                                               onClick={(e) => {
                                                                   if (_this.state.secret === '') {
                                                                       alert("256 bit secret string is required!");
                                                                       return;
                                                                   }
                                                                   _this.generateJwtHS256()
                                                               }}><i className="fas fa-lock"></i> Encode JWT
                                                                (HS256)</a>

                                                        </TabPane>
                                                    </TabContent>
                                                </div>
                                                }

                                            </div>
                                        </Collapse>
                                    </ListGroupItem>

                                    <ListGroupItem
                                        className={_.isEmpty(_this.state.jwtToken, true) ? "disabled" : ""}>
                                        <ListGroupItemHeading className="m-0" onClick={(e) => {
                                            _this.setState({jwtTokenEncodedVisible: !_this.state.jwtTokenEncodedVisible})
                                        }}><i
                                            className={_this.state.jwtTokenEncodedVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> Encoded
                                            JWT</ListGroupItemHeading>
                                        {!_.isEmpty(_this.state.jwtToken, true) &&
                                        <Collapse isOpen={this.state.jwtTokenEncodedVisible}>
                                            <div>

                                                    <pre
                                                        className="p-4 mt-3 text-break bg-light">{this.state.jwtToken}</pre>


                                                <div>
                                                    <a className="btn btn-success text-white mt-3 mr-1"
                                                       onClick={(e) => {
                                                           _this.downloadJwt()
                                                       }}><i className="fas fa-download"></i> Download JWT</a>
                                                </div>


                                                <h5 className="mt-4">Verify signature</h5>

                                                <small>
                                                <p>The JWT is signed, and the signature can be verified to see if contents have been tampered with.</p>
                                                <p>The RS256 public key is taken from JWT part with Form Data, if found in appropriate field.</p>
                                                <p>Decoding the JWT means the three parts of the JWT are shown as "human readable" JSON.</p>
                                                </small>


                                                <Nav tabs>

                                                    <NavItem>
                                                        <NavLink
                                                            className={classnames({active: this.state.algorithmTab === '1'})}
                                                            onClick={() => {
                                                                this.setState({algorithmTab: '1'});
                                                            }}>
                                                            RS256
                                                        </NavLink>
                                                    </NavItem>
                                                    <NavItem>
                                                        <NavLink
                                                            className={classnames({active: this.state.algorithmTab === '2'})}
                                                            onClick={() => {
                                                                this.setState({algorithmTab: '2'});
                                                            }}>
                                                            HS256
                                                        </NavLink>
                                                    </NavItem>
                                                </Nav>


                                                <TabContent activeTab={this.state.algorithmTab} className="mt-3">

                                                    <TabPane tabId="1">

                                                        <div className="form-group"><label
                                                            htmlFor="root_version">RSA Public Key</label> <textarea
                                                            className="form-control d-block mb-3"
                                                            placeholder="insert private key"
                                                            rows={10}
                                                            onChange={e => {
                                                                _this.state.formData.publicKey = e.target.value;
                                                                _this.forceUpdate()
                                                            }}
                                                            defaultValue={_this.state.formData.publicKey}></textarea>
                                                        </div>

                                                        <a className="btn btn-success text-white mt-3"
                                                           onClick={(e) => {
                                                               _this.verifyJwtRS256()
                                                           }}><i className="fas fa-certificate"></i> Verify
                                                            Signature (RS256)</a>

                                                    </TabPane>

                                                    <TabPane tabId="2">

                                                        <div className="form-group"><label
                                                            htmlFor="root_version">256 bit secret</label><input
                                                            className="form-control" id="secret"
                                                            label="version" required="" placeholder="insert secret"
                                                            type="text" onChange={e => {
                                                            _this.setState({secret: e.target.value});
                                                        }}/></div>


                                                        <a className="btn btn-success text-white mt-3"
                                                           onClick={(e) => {
                                                               _this.verifyJwtHS256()
                                                           }}><i className="fas fa-certificate"></i> Verify
                                                            Signature (HS256)</a>

                                                    </TabPane>

                                                </TabContent>


                                                <a className="btn btn-success text-white mt-3" onClick={(e) => {
                                                    _this.decodeJwt()
                                                }}><i className="fas fa-unlock"></i> Decode JWT</a><br/>

                                                {/*{!_.isEmpty(_this.state.signature, true) &&*/}
                                                {/*<JSONPretty*/}
                                                {/*    className="p-2 mt-3"*/}
                                                {/*    json={this.state.signature}*/}
                                                {/*    themeClassName="json-pretty"></JSONPretty>*/}
                                                {/*}*/}

                                            </div>
                                        </Collapse>
                                        }
                                    </ListGroupItem>

                                    <ListGroupItem
                                        className={_.isEmpty(_this.state.jwtTokenDecoded, true) ? "disabled" : ""}>
                                        <ListGroupItemHeading className="m-0" onClick={(e) => {
                                            _this.setState({jwtTokenDecodedVisible: !_this.state.jwtTokenDecodedVisible})
                                        }}><i
                                            className={_this.state.jwtTokenDecodedVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> Decoded
                                            JWT</ListGroupItemHeading>
                                        {!_.isEmpty(_this.state.jwtTokenDecoded, true) &&
                                        <Collapse isOpen={this.state.jwtTokenDecodedVisible}>
                                            <div>
                                                <JSONPretty
                                                    className="p-2 mt-3"
                                                    json={this.state.jwtTokenDecoded}
                                                    themeClassName="json-pretty"></JSONPretty>
                                            </div>
                                        </Collapse>
                                        }
                                    </ListGroupItem>

                                </ListGroup>



                            </div>

                        </div>
                    </div>

                    <div className="col-md-6">


                        <ButtonGroup className="mt-2 mb-3">
                            <Button className={classnames({active: this.state.mode === 'editor'})}
                                    onClick={e => this.setState({mode: 'editor'})}>CR Editor</Button>
                            <Button className={classnames({active: this.state.mode === 'viewer'})}
                                    onClick={e => this.setState({mode: 'viewer'})}>CR Viewer</Button>
                        </ButtonGroup>

                        {_this.state.mode === 'editor' &&
                        <div className="card card-body bg-light mb-5">

                            <Loader
                                show={_this.state.loadingInProgress}
                                contentBlur={1}
                                backgroundStyle={{backgroundColor: 'rgba(255,255,255,0.6)'}}
                                foregroundStyle={{color: '#000000'}}
                                message={loadingText}
                            >

                                <Form
                                    ref={(form) => {
                                        reactJsonSchemaForm = form;
                                    }}
                                    schema={_this.state.schema}
                                    formData={_this.state.formData}
                                    uiSchema={_this.state.uiSchema}
                                    onChange={_this.onFormDataChange}
                                    onError={log("errors")}>
                                    <br/> {/*<br/> workaround to hide submit button*/}
                                </Form>

                            </Loader>

                        </div>
                        }

                        {_this.state.mode === 'viewer' &&
                        <div className="card card-body bg-light mb-5">

                            <h4 className="mt-1">Consent receipt viewer</h4>

                            <div className="mt-3">
                                <ConsentViewer type="text" data={this.state.jwtTokenDecoded}/>
                            </div>

                            {/*<div className="jsonViewer">*/}
                            {/*    <JsonTable json={this.state.jwtTokenDecoded}/>*/}
                            {/*</div>*/}

                            {!_.isEmpty(_this.state.jwtTokenDecoded, true) &&
                            <JSONPretty
                                className="p-2 mt-3"
                                json={this.state.jwtTokenDecoded}
                                themeClassName="json-pretty"></JSONPretty>
                            }

                        </div>
                        }


                    </div>
                </div>
            </div>


        );
    }
}

export default CrEditorViewer;
