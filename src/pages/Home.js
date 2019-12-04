/**
 * Datafund Consent generator & viewer
 * Licensed under the MIT license
 * Created by Markus Zevnik, Tadej Fius, �rt Ahlin
 */

import React, {Component} from 'react';
import {
    Collapse,
    Navbar,
    Nav,
    ButtonGroup, 
    Button
} from 'reactstrap';

import {Link} from 'react-router-dom'
import logo from '../images/logo_black_alt.svg';
//import classnames from 'classnames';
import DataReceipt from "@datafund/data-receipt";
import CrEditorViewer from "../components/CrEditorViewer";
import CrStoreSendBlockchain from "../components/CrStoreSendBlockchain";
import ReceivedDataReceipts from "../components/ReceivedDataReceipts";
//import FDS from 'fds.js';

//const log = (type) => console.log.bind(console, type);

/*
window.FDS = new FDS({
    swarmGateway: 'https://swarm.fairdatasociety.org',
    ethGateway: 'https://geth-noordung.fairdatasociety.org',
    faucetAddress: 'https://dfaucet-testnet-prod.herokuapp.com/gimmie',
    httpTimeout: 1000,
    gasPrice: 1,
    ensConfig: {
        domain: 'datafund.eth',
        registryAddress: '0xc11f4427a0261e5ca508c982e747851e29c48e83',
        fifsRegistrarContractAddress: '0x01591702cb0c1d03b15355b2fab5e6483b6db9a7',
        resolverContractAddress: '0xf70816e998819443d5506f129ef1fa9f9c6ff5a7'
    },
    // multibox extension
    applicationDomain: "/shared/consents/"
});*/

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeMainTab: '1',
        };
    }

    componentDidMount() {
        console.log(DataReceipt);
    }

    render() {
        const _this = this;
        //const loadingText = <span><i className="mdi mdi-spin mdi-loading"></i> Loading ...</span>;

        return (
            <div>
                <Navbar color="faded" className="" light expand="lg">

                    <div className="container-fluid">
                        <Link className="navbar-brand" to="/"><img src={logo} alt={logo} className="img-fluid"/></Link>
                        <Collapse isOpen={this.state.isOpen} navbar>
                            <Nav className="ml-auto" navbar>
                            </Nav>
                        </Collapse>
                    
                        <ButtonGroup>
                                <Button active={this.state.activeMainTab === '1'} title="Generate and view a Consent Receipt" onClick={() => {
                                    this.setState({activeMainTab: '1'});
                                }} >Editor</Button>
                                <Button active={this.state.activeMainTab === '2'} title="Sign & send a Consent Receipt as Data controller" onClick={() => {
                                    this.setState({activeMainTab: '2'});
                                }} >Send & Sign </Button>
                                <Button active={this.state.activeMainTab === '3'} title="Browse and sign Consent Receipts as Data principal" onClick={() => {
                                    this.setState({activeMainTab: '3'});
                                }} >Received Receipts</Button>
                        </ButtonGroup>

                    </div>
                </Navbar>


                <div className="container-fluid mainContent">

                    {_this.state.activeMainTab === '1' &&
                    <CrEditorViewer/>
                    }

                    {_this.state.activeMainTab === '2' &&
                    <CrStoreSendBlockchain/>
                    }

                    {_this.state.activeMainTab === '3' &&
                    <ReceivedDataReceipts/>
                    }

                </div>
                <div><small>Consent Receipt Generator and Viewer demo application is meant only for demonstration purposes - as a reference implementation of different modules - and is not suitable to be used in production environments.
                        The modules are open sourced and free to use in your own configuration.</small></div>    
            </div>
        );
    }
}

export default App;

// "@datafund/data-receipt": git+https://https://github.com/datafund/datareceipt.js.git
// "fds.js": git+https://github.com/fairDataSociety/fds.js.git
// "@datafund/data-receipt": "^0.1.25",
