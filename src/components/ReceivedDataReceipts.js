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
import SimpleReactValidator from 'simple-react-validator'
import JSONPretty from "react-json-pretty";
import _ from "lodash";
import {ConsentViewer as ConsentViewer} from "@datafund/consent-viewer";
import DataReceipt from "@datafund/data-receipt";
import {Hook, Console, Decode} from 'console-feed'
import ReactTable from "react-table";
import {CSVLink, CSVDownload} from "react-csv";
import Loader from "react-loader-advanced";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import QRCode from "qrcode.react";

const log = (type) => console.log.bind(console, type);
let importWallet;

let CM = null;


class ReceivedDataReceipts extends Component {
    constructor(props) {
        super(props);
        this.state = {

            DataReceiptLib: new DataReceipt(),
            consoleVisible: true,
            dataControllerAccountVisible: true,

            account: null,
            consentManager: null,
            recipient: '',

            fairdropAccountName: '',
            fairdropAccountPassword: '',
            receiverFairdropAccountName: '',
            logs: [],

            multiboxData: [],
            receivedMessages: [],
            sentMessages: [],

            consentDetailsData: {},
            showConsentDetailsModal: false,

            loadingInProgress: false,
            loadingInModalInProgress: false
        };

        this.importAccount = this.importAccount.bind(this);
        this.createAccount = this.createAccount.bind(this);
        this.exportWallet = this.exportWallet.bind(this);
        this.getReceivedMessages = this.getReceivedMessages.bind(this);
        this.addReceived = this.addReceived.bind(this);
        this.setAccount = this.setAccount.bind(this);
        this.getStatusDescription = this.getStatusDescription.bind(this);
        this.showConsentDetails = this.showConsentDetails.bind(this);
        this.toggleConsentDetailsModal = this.toggleConsentDetailsModal.bind(this);
        this.crDetailsModalGiveConsent = this.crDetailsModalGiveConsent.bind(this);
        this.crDetailsModalRevokeConsent = this.crDetailsModalRevokeConsent.bind(this);
        this.validateForm = this.validateForm.bind(this);

        this.validator = new SimpleReactValidator({});
    }

    validateForm() {
        if (this.validator.allValid()) {
            return true;

        } else {
            console.log(this.validator);
            this.validator.showMessages();
            this.forceUpdate();

            return false;
        }
    }

    async createAccount() {
        const _this = this;

        if (!_this.validateForm()) {
            return
        }

        _this.setState({
            loadingInProgress: true
        });

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
                toast.success("Account created!");

                _this.unlockAccount();
            }

        } catch (err) {
            console.error(err);
        }


    }

    async unlockAccount() {
        const _this = this;

        if (!_this.validateForm()) {
            return
        }

        _this.setState({
            loadingInProgress: true
        });

        try {
            let account = await _this.state.DataReceiptLib.unlockAccount(_this.state.fairdropAccountName.toLowerCase(), _this.state.fairdropAccountPassword);

            if (account) {
                // console.info("-----> account unlocked: ");
                // console.info(account);
                // console.log("------------ \n\n");

                toast.success("Account unlocked!");

                _this.setAccount(account);

                CM = await _this.state.DataReceiptLib.getConsentManager();
                console.log(CM);

            }

        } catch (err) {
            console.error(err);

            toast.error("Error: " + err);

            _this.setState({
                loadingInProgress: false
            });
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


        await _this.getReceivedMessages();

        await _this.setState({
            loadingInProgress: false
        });
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
        const _this = this;
        let b = await account.getBalance();

        console.log("balance: ", b);

        _this.setState({
            balance: account.Tx.web3.utils.fromWei(b, 'ether')
        });
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

        //document.getElementsByClassName("mainContent")[0].classList.replace('container', 'container-fluid');

        console.log("console initialized");
    }

    render() {
        const _this = this;
        const loadingText = <span><i className="fa fa-sync fa-spin fa-fw"></i> Loading ...</span>;

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
                                        Account & Wallet</ListGroupItemHeading>
                                    <Collapse isOpen={this.state.dataControllerAccountVisible}>
                                        <div className="mt-3 mb-3">

                                            <div className="form-group"><label
                                                htmlFor="root_version">Fairdrop account name</label><input
                                                className="form-control" id="fairdropAccountName"
                                                label="version" required=""
                                                placeholder="enter Fairdrop account name" autoComplete="username"
                                                type="text" onChange={e => {
                                                _this.setState({fairdropAccountName: e.target.value});
                                            }}/>
                                                {_this.validator.message("account name", _this.state.fairdropAccountName, 'required', 'text-danger')}
                                            </div>

                                            <div className="form-group"><label
                                                htmlFor="root_version">Fairdrop account password</label><input
                                                className="form-control" id="fairdropAccountPassword"
                                                label="version" required=""
                                                placeholder="enter Fairdrop account password"
                                                autoComplete="new-password"
                                                type="password" onChange={e => {
                                                _this.setState({fairdropAccountPassword: e.target.value});
                                            }}/>
                                                {_this.validator.message("password", _this.state.fairdropAccountPassword, 'required', 'text-danger')}
                                            </div>


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


                                            <div className="d-none">
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

                                            {_this.state.account &&
                                            <div className="mt-3 mb-3 card">

                                                <div className="card-body p-4 pb-1">
                                                    <p>Account Name: <b>{_this.state.account.subdomain}</b></p>
                                                    <p>Balance: <b>{_this.state.balance ? _this.state.balance : '0'} D3X</b></p>
                                                    <p>Address: <b>{_this.state.account.address} </b></p>
                                                    <p><QRCode value={_this.state.account.address}/></p>
                                                </div>
                                            </div>
                                            }

                                        </div>
                                    </Collapse>
                                </ListGroupItem>

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


                <Modal size="xl" isOpen={_this.state.showConsentDetailsModal} toggle={_this.toggleConsentDetailsModal}
                       backdrop="static">
                    <ModalHeader toggle={_this.toggleConsentDetailsModal}>Consent Receipt Details
                        {/*<div className="downloadCsv mt-3"><CSVLink className={"pull-right"} data={_this.state.csvData} filename={_this.state.csvFileName}><i className="mdi mdi-file-document-outline"></i> Download CSV</CSVLink></div>*/}
                    </ModalHeader>
                    <ModalBody>


                        <Loader
                            show={_this.state.loadingInModalInProgress}
                            contentBlur={1}
                            backgroundStyle={{backgroundColor: 'rgba(255,255,255,0.6)'}}
                            foregroundStyle={{color: '#000000'}}
                            message={loadingText}
                        >

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

                        </Loader>

                    </ModalBody>
                </Modal>


            </div>


        );
    }
}

export default ReceivedDataReceipts;
