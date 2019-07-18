/**
 * Datafund Consent generator & viewer
 * Licensed under the MIT license
 * Created by Markus Zevnik, Tadej Fius, �rt Ahlin
 */

import React, {Component} from 'react';
import {
    Collapse,
    ListGroup,
    ListGroupItem,
    ListGroupItemHeading,
    Button,
    ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem, Modal, ModalHeader, ModalBody
} from 'reactstrap'

import JSONPretty from "react-json-pretty";
import _ from "lodash";
import jwt from "jsonwebtoken";
import config from "../projectConfiguration";
import {ConsentViewer as ConsentViewer} from "@datafund/consent-viewer";
import DataReceipt from "@datafund/data-receipt";
import {Hook, Console, Decode} from 'console-feed'
import ReactTable from "react-table";
import {CSVLink, CSVDownload} from "react-csv";

const log = (type) => console.log.bind(console, type);
let importWallet;

let CM = null;


class CrStoreSendBlockchain extends Component {
    constructor(props) {
        super(props);
        this.state = {

            DataReceiptLib: new DataReceipt(),
            consoleVisible: true,

            account: null,
            consentManager: null,
            recipient: '',

            fairdropAccountName: '',
            fairdropAccountPassword: '',
            receiverFairdropAccountName: '',
            logs: [],

            formData: {},
            cleanFormData: {},
            jwtToken: '',
            jwtTokenDecoded: {},
            signature: {},
            privateKey: '',

            multiboxData: [],
            receivedMessages: [],
            sentMessages: [],

            consentDetailsData: {},
            showConsentDetailsModal: false
        };


        this.onClean = this.onClean.bind(this);
        this.readDefaultProperties = this.readDefaultProperties.bind(this);
        this.onInputFileChange = this.onInputFileChange.bind(this);
        this.onImportWalletChange = this.onImportWalletChange.bind(this);
        this.importAccount = this.importAccount.bind(this);
        this.createAccount = this.createAccount.bind(this);
        this.generateJwtRS256 = this.generateJwtRS256.bind(this);
        this.verifyJwtRS256 = this.verifyJwtRS256.bind(this);
        this.decodeJwt = this.decodeJwt.bind(this);
        this.onPrivateKeyChange = this.onPrivateKeyChange.bind(this);
        this.sendTokenToDP = this.sendTokenToDP.bind(this);
        this.blockchainSignAndSendTokenToDP = this.blockchainSignAndSendTokenToDP.bind(this);
        this.exportWallet = this.exportWallet.bind(this);
        this.getReceivedMessages = this.getReceivedMessages.bind(this);
        this.getSentMessages = this.getSentMessages.bind(this);
        this.addReceived = this.addReceived.bind(this);
        this.setAccount = this.setAccount.bind(this);
        this.getStatusDescription = this.getStatusDescription.bind(this);
        this.showConsentDetails = this.showConsentDetails.bind(this);
        this.toggleConsentDetailsModal = this.toggleConsentDetailsModal.bind(this);
        this.crDetailsModalGiveConsent = this.crDetailsModalGiveConsent.bind(this);
        this.crDetailsModalRevokeConsent = this.crDetailsModalRevokeConsent.bind(this);
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

    onPrivateKeyChange(val) {
        const _this = this;
        console.log("onChange", val);
        //
        _this.setState({
            privateKey: val
        });
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

    decodeJwt() {
        const _this = this;

        let decoded = jwt.decode(_this.state.jwtToken, {complete: true});

        _this.setState({
            jwtTokenDecodedVisible: true,
            jwtTokenDecoded: decoded
        });
    }


    onImportWalletChange(e) {
        const _this = this;

        const reader = new FileReader();
        reader.addEventListener('load', () => {

            _this.importAccount(reader.result, filename);

        });
        let filename = e.target.files[0].name;
        reader.readAsText(e.target.files[0]);
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

    async createAccount() {
        const _this = this;

        try {
            let account = await _this.state.DataReceiptLib.createAccount(_this.state.fairdropAccountName.toLowerCase(), _this.state.fairdropAccountPassword, function (t) {
                console.error(t);
            }, function (t) {
                console.log(t);
            });

            if (account) {
                // console.info("-----> account created: ");
                // console.info(account);
                // console.log("------------ \n\n");

                _this.setAccount(account);
            }

        } catch (err) {
            console.error(err);
        }


    }

    async unlockAccount() {
        const _this = this;

        try {
            let account = await _this.state.DataReceiptLib.unlockAccount(_this.state.fairdropAccountName.toLowerCase(), _this.state.fairdropAccountPassword);

            if (account) {
                // console.info("-----> account unlocked: ");
                // console.info(account);
                // console.log("------------ \n\n");

                _this.setAccount(account);

                CM = await _this.state.DataReceiptLib.getConsentManager();
                console.log(CM);

            }

        } catch (err) {
            console.error(err);
        }
    }

    async setAccount(acc) {
        const _this = this;

        await this.setState({account: acc});


        _this.setState({consentManager: new _this.state.DataReceiptLib.getConsentManager()});

        // console.log("DataReceiptLib ", _this.state.DataReceiptLib);


        await this.updateMultibox(acc);
        await this.checkApllicationDomain(acc);
        await this.getBalance(acc);

        console.log(acc);
    }

    async updateMultibox(account) {
        let multiboxData = await account.Mail.Multibox.traverseMultibox(account, account.subdomain);
        await this.setState({multiboxData: multiboxData});

        console.log(multiboxData);
    }

    async checkApllicationDomain(account) {
        //let applicationNodeExists = await account.Mail.Multibox.createPath(account, this.props.applicationDomain, this.state.multiboxData.id);

        let applicationNodeExists = await account.Mail.Multibox.createPath(account, window.FDS.applicationDomain, this.state.multiboxData.id);
        if (applicationNodeExists > 0) {
            await this.updateMultibox(account);
        }
    }

    async getBalance(account) {
        let b = await account.getBalance();

        console.log("balance: ", b);
        //DataReceipt.prototype.setBalance(account.Tx.web3.utils.fromWei(b, 'ether'));
    }

    async importAccount(result, filename) {

        const _this = this;

        try {
            let account = await _this.state.DataReceiptLib.restoreAccount(result, filename, _this.state.fairdropAccountPassword);

            //console.warn("TODO: return result!")

        } catch (err) {
            console.error(err);
        }

    }

    exportWallet() {
        const _this = this;

        console.log(_this.state.account);

        _this.state.account.saveBackupAs();
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

    async sendTokenToDP() {
        const _this = this;

        await _this.state.DataReceiptLib.sendContents(_this.state.account, _this.state.recipient, _this.state.jwtToken,
            (output) => {
                console.log(output)
            },
            (results) => {
                console.log(results)
            });
    }

    async blockchainSignAndSendTokenToDP() {
        const _this = this;

        let userAddress = _this.state.account.address;
        let subjectAddress = await _this.state.DataReceiptLib.account.getAddressOf(_this.state.recipient);
        let swarmHash = await _this.state.DataReceiptLib.sendDataReceipt(_this.state.jwtToken, _this.state.recipient, (error) => {
                console.error(error)
            },
            (results) => {
                console.log(results)
            });

        console.log("User   :" + userAddress);
        console.log("Subject:" + subjectAddress);

        let tx = await CM.createConsent(userAddress, subjectAddress, "0x" + swarmHash);
        console.log("transaction finished", tx); // transaction finished

        let cf = await CM.getConsentsFor("0x" + swarmHash);
        console.log("cf ", cf);
        let consent = await _this.state.DataReceiptLib.getConsent(cf[cf.length - 1]);

        await consent.signUser();

        console.log("consent ", consent);
        // TODO: auto sign consent

    }

    async getSentMessages() {
        const _this = this;

        if (_this.state.receivingSent) return;
        if (_this.state.account === null) return;

        _this.setState({receivingSent: true});

        let messages = await _this.state.account.messages('sent', window.FDS.applicationDomain);
        let reader = new FileReader();

        await _this.setState({sentMessages: []});
        await _this.state.DataReceiptLib.asyncForEach(messages, async (message) => {

            try {
                // console.log(messages);
                // console.log(message);
                let file = await message.getFile(); // what if this fails?
                let isCRJWT = await _this.state.DataReceiptLib.IsConsentRecepit(file.name);
                let id = message.hash.address;

                if (!await _this.findReceived(id)) {
                    reader.onload = function (e) {
                        //let content = Helpers.ExtractMessage(reader.result);
                        _this.addSent({
                            id: id,
                            isHidden: false,
                            message: message,
                            data: reader.result,
                            isConsentReceipt: isCRJWT,
                            decodedToken: null,
                            verified: false
                        });
                        //console.log("reading", message);
                    }
                    await reader.readAsText(await this.state.account.receive(message));
                }

            } catch (err) {
                console.error(err);
            }
        });


        await this.setState({receivingSent: false});
    }


    async getReceivedMessages() {
        const _this = this;

        if (_this.state.receiving) return;
        if (_this.state.account === null) return;

        _this.setState({receiving: true});

        let messages = await _this.state.account.messages('received', window.FDS.applicationDomain);
        let reader = new FileReader();

        await _this.setState({receivedMessages: []});
        await _this.state.DataReceiptLib.asyncForEach(messages, async (message) => {

            try {
                // console.log(messages);
                // console.log(message);
                let file = await message.getFile(); // what if this fails?
                let isCRJWT = await _this.state.DataReceiptLib.IsConsentRecepit(file.name);
                let id = message.hash.address;

                if (!await _this.findReceived(id)) {
                    reader.onload = function (e) {
                        //let content = Helpers.ExtractMessage(reader.result);
                        _this.addReceived({
                            id: id,
                            isHidden: false,
                            message: message,
                            data: reader.result,
                            isConsentReceipt: isCRJWT,
                            decodedToken: null,
                            verified: false
                        });
                        //console.log("reading", message);
                    }
                    await reader.readAsText(await this.state.account.receive(message));
                }

            } catch (err) {
                console.error(err);
            }
        });

        await this.setState({receiving: false});
    }

    async findReceived(msgId) {
        return this.state.receivedMessages.find(msg => msg.id === msgId);
    }

    async addSent(msg) {
        const _this = this;

        // TODO!
        try {
            msg.decodedToken = await _this.state.DataReceiptLib.decode(msg.data); //, { complete: true });

            if (msg.decodedToken !== null) {
                msg.verified = await _this.state.DataReceiptLib.verify(msg.decodedToken.payload.publicKey, msg.data);
            }

        } catch (err) {
            console.error(err);
        }

        // console.log("SWARM HASH: ", msg.message.hash.address);

        try {
            let consents = await CM.getConsentsFor("0x" + msg.message.hash.address);

            if (consents && consents.length > 0) {
                // TODO: verify only last one in the array
                await _this.checkConsent([consents[consents.length - 1]], msg);
            }

        } catch (err) {
            console.error(err);
        }


        await _this.setState({sentMessages: [msg, ..._this.state.sentMessages]});

    }

    async addReceived(msg) {
        const _this = this;

        // TODO!
        try {
            msg.decodedToken = await _this.state.DataReceiptLib.decode(msg.data); //, { complete: true });

            if (msg.decodedToken !== null) {
                msg.verified = await _this.state.DataReceiptLib.verify(msg.decodedToken.payload.publicKey, msg.data);
            }

        } catch (err) {
            console.error(err);
        }

        // console.log("SWARM HASH: ", msg.message.hash.address);

        try {
            let consents = await CM.getConsentsFor("0x" + msg.message.hash.address);

            if (consents && consents.length > 0) {
                // TODO: verify only last one in the array
                await _this.checkConsent([consents[consents.length - 1]], msg);
            }

        } catch (err) {
            console.error(err);
        }


        await _this.setState({receivedMessages: [msg, ..._this.state.receivedMessages]});

    }

    async checkConsent(consentAddresses, msg) {
        const _this = this;

        await _this.state.DataReceiptLib.asyncForEach(consentAddresses, async (consentAddress) => {

            try {
                console.log("consentAddress ", consentAddress);
                let consent = await _this.state.DataReceiptLib.getConsent(consentAddress);

                console.log("consent: ", consent);

                let us, ss, s, v, updated, status;

                us = await consent.isUserSigned();
                ss = await consent.isSubjectSigned();
                s = await consent.isSigned();
                v = await consent.isValid();

                // if updated anything else than 0x0000000000000000000000000000000000000000
                // then consent was updated with another consent
                updated = await consent.isUpdatedWith();
                // 0 - waiting for signatures
                // 1 - active
                // 2 - expired
                // 3 - revoked
                status = await consent.status();

                // console.log(consentAddress, 'signed (subject, user, both, valid)', ss, us, s, v);
                // console.log('status', status, ' updated', updated);

                let consentStatus = {'us': us, 'ss': ss, 's': s, 'v': v, 'updated': updated, 'status': status};
                msg.consentStatus = consentStatus;

                //return msg

            } catch (e) {

                console.log("error ", e)

            }
        });
    }


    getStatusDescription(statusId) {
        let statusLabel = 'n/a';

        switch (parseInt(statusId)) {
            case 0:
                statusLabel = 'waiting for signatures';
                break;
            case 1:
                statusLabel = 'active';
                break;
            case 2:
                statusLabel = 'expired';
                break;
            case 3:
                statusLabel = 'revoked';
                break;
        }

        return statusLabel;

    }

    showConsentDetails(consentDetailsData, typeOfMessageInModal) {
        const _this = this;

        console.log(consentDetailsData);

        _this.setState({
            consentDetailsData: consentDetailsData,
            typeOfMessageInModal: typeOfMessageInModal
        });
        _this.toggleConsentDetailsModal();
    }


    toggleConsentDetailsModal() {
        const _this = this;

        _this.setState({
            showConsentDetailsModal: !_this.state.showConsentDetailsModal
        });

        setTimeout(function () {
            if (!_this.state.showConsentDetailsModal) {
                _this.setState({
                    consentDetailsData: {},
                    typeOfMessageInModal: null
                });
            }
        }, 10)

    }

    async crDetailsModalGiveConsent() {
        const _this = this;

        let consents = await CM.getConsentsFor("0x" + _this.state.consentDetailsData.message.hash.address);
        let consent = null;

        if (consents && consents.length > 0) {
            consent = await _this.state.DataReceiptLib.getConsent(consents[consents.length - 1]);
        }

        let ss = await consent.isSubjectSigned();
        console.log("ss ", ss);
        await consent.signSubject();
    }

    async crDetailsModalRevokeConsent() {
        const _this = this;

        let consents = await CM.getConsentsFor("0x" + _this.state.consentDetailsData.message.hash.address);
        let consent = null;

        if (consents && consents.length > 0) {
            consent = await _this.state.DataReceiptLib.getConsent(consents[consents.length - 1]);
        }

        await consent.revokeConsent();

    }

    componentDidMount() {
        const _this = this;


        Hook(window.console, log => {
            this.setState(({logs}) => ({logs: [...logs, Decode(log)]}))
        });

        //_this.interval = setInterval(() => this.getReceivedMessages(), 2000);

        // console.log(`Hello world!`)
        //

        //_this.unlockAccount();

        console.log("console initialized");
    }

    render() {
        const _this = this;
        const loadingText = <span><i className="mdi mdi-spin mdi-loading"></i> Loading ...</span>;

        return (
            <div>
                <div className="row mb-5">

                    <div className="col-md-4 border-right">

                        <div className="row">
                            <div className="col-md-12">
                                <h5>Decentralized storage and sending</h5>
                            </div>
                        </div>


                        <div className="row">
                            <div className="col-md-12">

                                <ListGroupItem>
                                    <ListGroupItemHeading className="m-0" onClick={(e) => {
                                        _this.setState({dataControllerAccountVisible: !_this.state.dataControllerAccountVisible})
                                    }}><i
                                        className={_this.state.dataControllerAccountVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> Data
                                        Controller Account & wallet</ListGroupItemHeading>
                                    <Collapse isOpen={this.state.dataControllerAccountVisible}>
                                        <div className="mt-3 mb-3">

                                            <div className="form-group"><label
                                                htmlFor="root_version">Fairdrop account name</label><input
                                                className="form-control" id="fairdropAccountName"
                                                label="version" required=""
                                                placeholder="enter Fairdrop account name" autoComplete="username"
                                                type="text" onChange={e => {
                                                _this.setState({fairdropAccountName: e.target.value});
                                            }}/></div>

                                            <div className="form-group"><label
                                                htmlFor="root_version">Fairdrop account password</label><input
                                                className="form-control" id="fairdropAccountPassword"
                                                label="version" required=""
                                                placeholder="enter Fairdrop account password"
                                                autoComplete="new-password"
                                                type="password" onChange={e => {
                                                _this.setState({fairdropAccountPassword: e.target.value});
                                            }}/></div>


                                            <ButtonDropdown className="mt-3" isOpen={this.state.walletDropdownOpen}
                                                            toggle={(e) => {
                                                                this.setState({walletDropdownOpen: !this.state.walletDropdownOpen})
                                                            }}>
                                                <DropdownToggle caret color="primary">
                                                    Wallet
                                                </DropdownToggle>
                                                <DropdownMenu>
                                                    <DropdownItem onClick={(e) => this.createAccount()}><i
                                                        className="fa fa-plus"></i> Create
                                                        Wallet</DropdownItem>
                                                    <DropdownItem onClick={(e) => this.unlockAccount()}><i
                                                        className="fa fa-unlock"></i> Unlock
                                                        Wallet</DropdownItem>
                                                    <DropdownItem onClick={(e) => {
                                                        // let event = new Event("click");
                                                        // importWallet.dispatchEvent(event);
                                                        // console.log(importWallet)

                                                        //importWallet.dispatchEvent(new Event("click"));
                                                        importWallet.click();


                                                    }}><i className="fa fa-download"></i> Import
                                                        Wallet</DropdownItem>
                                                    <DropdownItem onClick={(e) => {
                                                        // let event = new Event("click");
                                                        // importWallet.dispatchEvent(event);
                                                        // console.log(importWallet)

                                                        //importWallet.dispatchEvent(new Event("click"));
                                                        this.exportWallet();


                                                    }}><i className="fa fa-upload"></i> Export
                                                        Wallet</DropdownItem>
                                                </DropdownMenu>
                                            </ButtonDropdown>


                                            <div className="mb-3 d-none">
                                                <label className="btn btn-primary d-inline" htmlFor={"importWallet"}
                                                       ref={(input) => {
                                                           importWallet = input;
                                                       }}><i
                                                    className="fa fa-upload"></i> Import wallet
                                                    <input id="importWallet" className="mt-4" type="file"
                                                           accept=".json,application/json"
                                                           onChange={_this.onImportWalletChange} style={{
                                                        width: '0px',
                                                        height: '0px',
                                                        overflow: 'hidden'
                                                    }}/></label>
                                            </div>


                                            {!_.isEmpty(_this.state.account, true) &&
                                            <JSONPretty
                                                className="p-2 mt-3"
                                                json={this.state.account}
                                                themeClassName="json-pretty"></JSONPretty>
                                            }


                                        </div>
                                    </Collapse>
                                </ListGroupItem>


                                <ListGroup className="mt-3 mb-3">

                                    <ListGroupItem>
                                        <ListGroupItemHeading className="m-0" onClick={(e) => {
                                            _this.setState({projectConfigurationVisible: !_this.state.projectConfigurationVisible})
                                        }}><i
                                            className={_this.state.projectConfigurationVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> Project
                                            Configuration</ListGroupItemHeading>

                                        <Collapse isOpen={this.state.projectConfigurationVisible}>

                                            <div>

                                                <div className="mt-3 mb-3">
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

                                                {!_.isEmpty(_this.state.formData, true) &&
                                                <JSONPretty
                                                    className="p-2 mt-3"
                                                    json={this.state.formData}
                                                    themeClassName="json-pretty"></JSONPretty>
                                                }


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
                                                    Form Data must not be empty!</em>
                                                }

                                                {!_.isEmpty(_this.state.formData, true) &&
                                                <div>
                                                    <h5 className="mt-4">Encode</h5>

                                                    <div className="mt-3">

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
                                                           }}><i className="fas fa-lock"></i> Encode JWT (RS256)</a>

                                                        {!_.isEmpty(_this.state.jwtToken, true) &&
                                                        <pre
                                                            className="p-4 mt-3 text-break bg-light">{_this.state.jwtToken}</pre>
                                                        }

                                                    </div>
                                                </div>
                                                }

                                            </div>
                                        </Collapse>
                                    </ListGroupItem>


                                </ListGroup>


                                <ListGroup className="mt-3">
                                    <ListGroupItem>
                                        <ListGroupItemHeading className="m-0" onClick={(e) => {
                                            _this.setState({sendCRVisible: !_this.state.sendCRVisible})
                                        }}><i
                                            className={_this.state.sendCRVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> Send
                                            Consent Receipt JWT</ListGroupItemHeading>
                                        <Collapse isOpen={this.state.sendCRVisible}>
                                            <div className="mt-3 mb-3">

                                                <div className="form-group"><label
                                                    htmlFor="root_version">Receiver's Fairdrop account
                                                    name</label><input
                                                    className="form-control" id="secret"
                                                    label="version" required=""
                                                    placeholder="enter receiver's Fairdrop account name"
                                                    autoComplete="username"
                                                    type="text" onChange={e => {
                                                    _this.setState({recipient: e.target.value});
                                                }}/></div>

                                                <div className="mt-3">
                                                    <a className="btn btn-primary btn-block"
                                                       onClick={_this.sendTokenToDP}> Data controller - send CR
                                                        JWT to Data principal</a>
                                                </div>

                                            </div>
                                        </Collapse>
                                    </ListGroupItem>
                                </ListGroup>


                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-12 mt-5">
                                <h5>Blockchain signing</h5>
                            </div>
                        </div>


                        <div className="row">
                            <div className="col-md-12">
                                <a className="btn btn-primary btn-block"
                                   onClick={_this.blockchainSignAndSendTokenToDP}> Data controller - Blockchain sign and
                                    send CR
                                    JWT to Data principal</a>
                            </div>
                        </div>


                    </div>

                    <div className="col-md-8">

                        <ListGroup className="mt-3 mb-3">
                            <div className="row">
                                <div className="col-md-12">
                            <ListGroupItem>
                                <ListGroupItemHeading className="m-0" onClick={(e) => {
                                    _this.setState({consoleVisible: !_this.state.consoleVisible})
                                }}><i
                                    className={_this.state.consoleVisible ? "fas text-muted fa-minus-square" : "fas text-muted fa-plus-square"}></i> Console
                                </ListGroupItemHeading>

                                <Collapse isOpen={this.state.consoleVisible}>


                                            <ul style={{
                                                backgroundColor: '#242424',
                                                maxHeight: '200px',
                                                height: '200px',
                                                overflowY: 'auto',
                                                display: 'flex',
                                                flexDirection: 'column-reverse',
                                                paddingLeft: '0px'
                                            }}>
                                                <Console logs={_this.state.logs} variant="dark"/>
                                            </ul>


                                </Collapse>

                            </ListGroupItem>
                                </div>
                            </div>
                        </ListGroup>


                        <div className="row">
                            <div className="col-md-12 mt-5">
                                <h4 style={{cursor: 'pointer'}} className="d-inline" onClick={(e) => _this.getSentMessages()}>
                                    <i className={this.state.receivingSent ? 'fa fa-sync fa-spin fa-fw' : 'fa fa-sync'}></i> Data controller
                                    sent Data Receipts</h4>
                                <CSVLink
                                    filename={"received_data_receipts.csv"}
                                    className={"btn bnt-sm btn-secondary float-right mb-2 mt-0"}
                                    data={this.state.sentMessages}><i className="fa fa-download"></i> Download
                                    Data</CSVLink>
                            </div>

                            <div className="col-md-12">
                                <ReactTable
                                    data={this.state.sentMessages}
                                    loading={this.state.receivingSent}
                                    columns={[
                                        {
                                            columns: [
                                                {
                                                    expander: true,
                                                    width: 65,
                                                    Expander: ({isExpanded, ...rest}) =>
                                                        <div>
                                                            {isExpanded
                                                                ? <span>&#x2299;</span>
                                                                : <span>&#x2295;</span>}
                                                        </div>,
                                                    style: {
                                                        cursor: "pointer",
                                                        fontSize: 25,
                                                        padding: "0",
                                                        textAlign: "center",
                                                        userSelect: "none"
                                                    }
                                                },
                                                {
                                                    Header: "Data Principal",
                                                    accessor: "message.from"
                                                },
                                                {
                                                    Header: "Valid",
                                                    accessor: "verified",
                                                    Cell: row => (
                                                        <div className="text-center">
                                                            {row.value.toString() === 'false' ? 'FALSE' : 'TRUE'}
                                                        </div>
                                                    )
                                                },
                                                {
                                                    Header: "On Blockchain",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && typeof row.value !== 'undefined') ? 'TRUE' : 'FALSE'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Signed By You",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && row.value.ss) ? 'TRUE' : 'FALSE'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Signed By Principal",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && row.value.us) ? 'TRUE' : 'FALSE'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Status",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && row.value.status) ? _this.getStatusDescription(row.value.status) : 'n/a'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Reference",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && row.value.updated) ? row.value.updated : 'n/a'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Action",
                                                    Cell: row => {

                                                        return (
                                                            <div className="text-center">
                                                                <a className="btn btn-primary btn-sm pt-1 pb-1" onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    _this.showConsentDetails(row.original, 'sent')
                                                                }}>View</a>
                                                            </div>
                                                        )
                                                    }
                                                }
                                            ]
                                        }
                                    ]}
                                    defaultPageSize={10}
                                    className="-striped -highlight"
                                    resizable={true}
                                    SubComponent={(e) => <div style={{padding: '10px'}}>
                                        Additional Consent Receipt info:<br/><br/>

                                        {!_.isEmpty(e.original, true) &&
                                        <JSONPretty
                                            className="p-2 mt-3"
                                            json={e.original}
                                            themeClassName="json-pretty"></JSONPretty>
                                        }

                                    </div>}
                                />
                            </div>

                        </div>

                        <div className="row">
                            <div className="col-md-12 mt-5">
                                <h4 style={{cursor: 'pointer'}} className="d-inline" onClick={(e) => _this.getReceivedMessages()}>
                                    <i className={this.state.receiving ? 'fa fa-sync fa-spin fa-fw' : 'fa fa-sync'}></i> Data controller
                                    received Data Receipts</h4>
                                <CSVLink
                                    filename={"sent_data_receipts.csv"}
                                    className={"btn bnt-sm btn-secondary float-right mb-2 mt-0"}
                                    data={this.state.receivedMessages}><i className="fa fa-download"></i> Download Data</CSVLink>
                            </div>

                            <div className="col-md-12">
                                <ReactTable
                                    data={this.state.receivedMessages}
                                    loading={this.state.receiving}
                                    columns={[
                                        {
                                            columns: [
                                                {
                                                    expander: true,
                                                    width: 65,
                                                    Expander: ({isExpanded, ...rest}) =>
                                                        <div>
                                                            {isExpanded
                                                                ? <span>&#x2299;</span>
                                                                : <span>&#x2295;</span>}
                                                        </div>,
                                                    style: {
                                                        cursor: "pointer",
                                                        fontSize: 25,
                                                        padding: "0",
                                                        textAlign: "center",
                                                        userSelect: "none"
                                                    }
                                                },
                                                {
                                                    Header: "Data Principal",
                                                    accessor: "message.from"
                                                },
                                                {
                                                    Header: "Valid",
                                                    accessor: "verified",
                                                    Cell: row => (
                                                        <div className="text-center">
                                                            {row.value.toString() === 'false' ? 'FALSE' : 'TRUE'}
                                                        </div>
                                                    )
                                                },
                                                {
                                                    Header: "On Blockchain",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && typeof row.value !== 'undefined') ? 'TRUE' : 'FALSE'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Signed By You",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && row.value.ss) ? 'TRUE' : 'FALSE'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Signed By Principal",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && row.value.us) ? 'TRUE' : 'FALSE'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Status",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && row.value.status) ? _this.getStatusDescription(row.value.status) : 'n/a'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Reference",
                                                    accessor: "consentStatus",
                                                    Cell: row => {
                                                        return (
                                                            <div>
                                                                {(row.value && row.value.updated) ? row.value.updated : 'n/a'}
                                                            </div>
                                                        )
                                                    }
                                                },
                                                {
                                                    Header: "Action",
                                                    Cell: row => {

                                                        return (
                                                            <div className="text-center">
                                                                <a className="btn btn-primary btn-sm pt-1 pb-1" onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    _this.showConsentDetails(row.original, 'received')
                                                                }}>View</a>
                                                            </div>
                                                        )
                                                    }
                                                }
                                            ]
                                        }
                                    ]}
                                    defaultPageSize={10}
                                    className="-striped -highlight"
                                    resizable={true}
                                    SubComponent={(e) => <div style={{padding: '10px'}}>
                                        Additional Consent Receipt info:<br/><br/>

                                        {!_.isEmpty(e.original, true) &&
                                        <JSONPretty
                                            className="p-2 mt-3"
                                            json={e.original}
                                            themeClassName="json-pretty"></JSONPretty>
                                        }

                                    </div>}
                                />
                            </div>


                        </div>


                    </div>

                </div>


                <Modal isOpen={_this.state.showConsentDetailsModal} toggle={_this.toggleConsentDetailsModal}
                       backdrop="static">
                    <ModalHeader toggle={_this.toggleConsentDetailsModal}>Consent Receipt Details
                        {/*<div className="downloadCsv mt-3"><CSVLink className={"pull-right"} data={_this.state.csvData} filename={_this.state.csvFileName}><i className="mdi mdi-file-document-outline"></i> Download CSV</CSVLink></div>*/}
                    </ModalHeader>
                    <ModalBody>


                        <div className="row">
                            <div className="col-md-12 mb-3">


                                <ConsentViewer type="text" data={_this.state.consentDetailsData.decodedToken}/>
                            </div>

                            <div className="p-3">
                                <div className="row">
                                    {_this.state.typeOfMessageInModal === 'received' &&
                                    <div className="col-md-7 mb-3">
                                        <a className="btn btn-primary" onClick={_this.crDetailsModalGiveConsent}>Give Consent and Sign on <i
                                            className="fa fa-link"></i></a>
                                        <a className="btn btn-primary mt-2" onClick={_this.crDetailsModalRevokeConsent}>Revoke Consent</a>
                                    </div>
                                    }
                                    <div className="col-md-4 mb-2">
                                        <div>Token: <b>{_.isEmpty(_this.state.consentDetailsData.decodedToken, true) ? 'INVALID': 'VALID'}</b></div>
                                        <div className="mt-4">Signature: <b>{_.isEmpty(_this.state.consentDetailsData.verified, true) ? 'INVALID': 'VALID'}</b></div>
                                    </div>
                                </div>


                                <div className="row">
                                    <div className="col-md-12 mb-3">
                                        <div className="mt-5">
                                            <Button color="secondary"
                                                    onClick={_this.toggleConsentDetailsModal}>Close</Button>
                                        </div>


                                    </div>
                                </div>
                            </div>
                        </div>

                    </ModalBody>
                </Modal>


            </div>


        );
    }
}

export default CrStoreSendBlockchain;
