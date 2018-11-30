import * as React from 'react';
import JsonClient from './JsonServices/JsonClient';
import { Calculate } from './Messages/Calculate';
import { EventBroadcaster } from './Messages/EventBroadcaster';
import { GetVersion } from './Messages/GetVersion';

interface IState {
    webSocketAddress: string;
    webSocketStatus: string;
    messageLog: string;
    eventLog: string;
    versionIsInternal: boolean;
    versionResult: string;
    calcFirst: string,
    calcOperation: string,
    calcSecond: string,
    calcResult: string,
    eventName: string,
    subscriptionStatus: string,
    unsubscriptions: Array<{
        eventName: string,
        unsubscribe: () => void
    }>
}

export class ServiceExecutor extends React.Component<{}, IState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            webSocketAddress: "ws://localhost:8765/", //  window.location.toString().replace("http", "ws"),
            webSocketStatus: 'Not connected',
            messageLog: '',
            eventLog: '',
            versionIsInternal: false,
            versionResult: '(not called)',
            calcFirst: '353',
            calcOperation: '+',
            calcSecond: '181',
            calcResult: '(not called)',
            eventName: 'IFoo.AfterStartup',
            subscriptionStatus: '(not subscribed)',
            unsubscriptions: [],
        };
    }

    private client?: JsonClient;

    private connect = async () => {
        try {
            this.client = new JsonClient(this.state.webSocketAddress);
            await this.client.connectAsync();
            this.client.traceMessage = this.traceMessage;
            this.setState({
                webSocketStatus: 'Connected'
            });
        } catch (e) {
            this.client = undefined;
            this.setState({
                webSocketStatus: 'Failure: ' + e.message
            })
        }
    }

    private traceMessage = (e: { isOutcoming: boolean, data: string }) => {
        this.setState(state => ({
            messageLog: state.messageLog + (e.isOutcoming ? "--> " : "<-- ") + e.data + "\n"
        }));
    }

    // event handlers for HTML elements
    private editWebSocketAddress = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ webSocketAddress: e.currentTarget.value });
    private toggleVersionIsInternal = (e: React.ChangeEvent<HTMLInputElement>) => this.setState(o => ({ versionIsInternal: !o.versionIsInternal }));
    private editFirst = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ calcFirst: e.currentTarget.value });
    private editSecond = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ calcSecond: e.currentTarget.value });
    private editOperation = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ calcOperation: e.currentTarget.value });
    private editEventName = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ eventName: e.currentTarget.value });

    // call GetVersion service
    private getVersion = async () => {
        if (this.client === undefined) {
            this.setState({
                versionResult: 'not connected! try connecting first'
            });
            return;
        }

        try {
            const getVersion = new GetVersion();
            getVersion.IsInternal = this.state.versionIsInternal;
            const result = await this.client.call(getVersion);
            this.setState({
                versionResult: result.Version
            })
        } catch (e) {
            this.setState({
                versionResult: 'error: ' + e.message
            })
        }
    }

    // call Calculate service
    private calculate = async () => {
        if (this.client === undefined) {
            this.setState({
                calcResult: 'not connected! try connecting first'
            });
            return;
        }

        try {
            const calculate = new Calculate();
            calculate.FirstOperand = parseFloat(this.state.calcFirst);
            calculate.Operation = this.state.calcOperation;
            calculate.SecondOperand = parseFloat(this.state.calcSecond);

            const result = await this.client.call(calculate);
            this.setState({
                calcResult: result.Result
            })
        } catch (e) {
            this.setState({
                calcResult: 'error: ' + e.message
            })
        }
    }

    // event handler
    public handleEvent = (...args: any[]) => {
        this.setState(oldState => ({
            eventLog: oldState.eventLog + JSON.stringify(args) + "\n"
        }));
    }

    // subscribe to the given event
    public subscribeToEvent = async () => {
        if (this.client === undefined) {
            this.setState({
                subscriptionStatus: 'not connected! try connecting first'
            });
            return;
        }

        try {
            // real unsubscription
            const unsub = await this.client.subscribe({
                eventName: this.state.eventName,
                eventHandler: this.handleEvent,
            });

            // our own unsubscription handler
            const unsubscription = {
                eventName: this.state.eventName,
                unsubscribe: async () => {
                    try {
                        await unsub;
                        this.setState(oldState => ({
                            subscriptionStatus: 'unsubscribed from ' + this.state.eventName,
                            unsubscriptions: oldState.unsubscriptions.filter(v => v !== unsubscription)
                        }))
                    } catch (e) {
                        this.setState({
                            subscriptionStatus: 'error unsubscribing from ' + this.state.eventName + ': ' + e.message
                        });
                    }
                }
            }

            // wohoo! we're subscribed to the event
            this.setState(oldState => ({
                subscriptionStatus: 'subscribed to ' + this.state.eventName,
                unsubscriptions: oldState.unsubscriptions.concat([ unsubscription ])
            }));
        } catch (e) {
            this.setState({
                subscriptionStatus: 'error: ' + e.message
            })
        }
    }

    public broadcastEvent = async () => {
        if (this.client === undefined) {
            this.setState({
                subscriptionStatus: 'not connected! try connecting first'
            });
            return;
        }

        const msg = new EventBroadcaster();
        msg.EventName = this.state.eventName;
        await this.client.call(msg);
    }

    public render() {
        return (
            <div>
                <h2>Server address</h2>
                <input type="text" value={this.state.webSocketAddress} onChange={this.editWebSocketAddress} />
                <input type="button" value="Connect" onClick={this.connect} style={{ margin: 8 }}/>
                <span>{this.state.webSocketStatus}</span>

                <h2>GetVersion</h2>
                <label style={{ marginRight: 8 }}>
                    <input type="checkbox" checked={this.state.versionIsInternal} onChange={this.toggleVersionIsInternal}/>
                    Internal version details
                </label>
                <input type="button" value="GetVersion" onClick={this.getVersion} />
                <label style={{ marginLeft: 8 }}>
                    Result: {this.state.versionResult}
                </label>

                <h2>Calculate</h2>
                <input type="text" value={this.state.calcFirst} onChange={this.editFirst}/>
                <input type="text" value={this.state.calcOperation} onChange={this.editOperation}/>
                <input type="text" value={this.state.calcSecond} onChange={this.editSecond}/>
                <input type="button" value="=" onClick={this.calculate} />
                <label style={{ marginLeft: 8 }}>
                    Result: {this.state.calcResult}
                </label>

                <h2>Subscribe and broadcast</h2>
                <input type="text" value={this.state.eventName} placeholder="IFoo.AfterStartup or IBar.BeforeShutdown or whatever" onChange={this.editEventName}/>
                <input type="button" value="Subscribe to event" onClick={this.subscribeToEvent} />
                <input type="button" value="Broadcast event" onClick={this.broadcastEvent} />
                {
                    // unsubscription buttons
                    this.state.unsubscriptions.map((uns, index) => <input key={index} type="button" value={"Unsubscribe from " + uns.eventName} onClick={uns.unsubscribe} />)
                }

                <h2>Message log</h2>
                <pre>{this.state.messageLog}</pre>
            </div>
        );
    }
}

export default ServiceExecutor;