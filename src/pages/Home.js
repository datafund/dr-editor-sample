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
    Nav,
    NavLink
} from 'reactstrap'

import {Link} from 'react-router-dom'
import logo from '../images/logo_black_alt.svg';
import classnames from 'classnames';
import DataReceipt from "@datafund/data-receipt";
import CrEditorViewer from "../components/CrEditorViewer";
import CrStoreSendBlockchain from "../components/CrStoreSendBlockchain";
import ReceivedDataReceipts from "../components/ReceivedDataReceipts";
import FDS from 'fds.js';

const log = (type) => console.log.bind(console, type);


window.FDS = new FDS({
    swarmGateway: 'https://swarm.fairdatasociety.org',
    ethGateway: 'https://geth-noordung.fairdatasociety.org',
    faucetAddress: 'https://dfaucet-testnet-prod.herokuapp.com/gimmie',
    httpTimeout: 1000,
    gasPrice: 0.1,
    ensConfig: {
        domain: 'datafund.eth',
        registryAddress: '0xc11f4427a0261e5ca508c982e747851e29c48e83',
        fifsRegistrarContractAddress: '0x01591702cb0c1d03b15355b2fab5e6483b6db9a7',
        resolverContractAddress: '0xf70816e998819443d5506f129ef1fa9f9c6ff5a7'
    },
    // multibox extension
    applicationDomain: "/shared/consents/"
});

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {

            activeMainTab: '1',

        };
    }

    componentDidMount() {
        const _this = this;


        console.log(DataReceipt);


    }

    render() {
        const _this = this;
        const loadingText = <span><i className="mdi mdi-spin mdi-loading"></i> Loading ...</span>;

        return (
            <div>

                <Navbar color="faded" className="" light expand="lg">
                    <div className="container">

                        <Link className="navbar-brand" to="/"><img src={logo} alt={logo}
                                                                   className="img-fluid"/></Link>

                        <Collapse isOpen={this.state.isOpen} navbar>
                            <Nav className="ml-auto" navbar>
                            </Nav>
                        </Collapse>
                    </div>
                </Navbar>

                <div className="container mainContent">

                    <div className="row">
                        <div className="col-md-12">

                            <Nav tabs className="mt-1 mb-4 mainNav">
                                <NavItem>
                                    <NavLink
                                        className={classnames({active: this.state.activeMainTab === '1'})}
                                        onClick={() => {
                                            this.setState({activeMainTab: '1'});
                                        }}>
                                        Consent Receipt Editor & Viewer
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({active: this.state.activeMainTab === '2'})}
                                        onClick={() => {
                                            this.setState({activeMainTab: '2'});
                                        }}>

                                        Consent Receipt Storage & Sending & Blockchain signing (data controller / user)
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({active: this.state.activeMainTab === '3'})}
                                        onClick={() => {
                                            this.setState({activeMainTab: '3'});
                                        }}>

                                        Received Data Receipts (data principal / giver)
                                    </NavLink>
                                </NavItem>
                            </Nav>


                        </div>
                    </div>

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

            </div>
        );
    }
}

export default App;
