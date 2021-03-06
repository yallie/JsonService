import * as React from 'react';
import JsonClient from 'json-services-client';
import { Calculate } from './Messages/Calculate';
import { EventBroadcaster } from './Messages/EventBroadcaster';
import { GetVersion } from './Messages/GetVersion';

const FilteredEvent = "FilteredEvent";

interface IState {
    webSocketAddress: string;
    webSocketStatus: string;
    messageLog: string;
    eventLog: string;
    activeDemo: 'getVersion' | 'calculate' | 'events',
    versionIsInternal: boolean;
    versionResult: string;
    calcFirst: string,
    calcOperation: string,
    calcSecond: string,
    calcResult: string,
    eventName: string,
    eventFilter: string;
    subscriptionStatus: string,
    subscriptions: Array<{
        eventName: string,
        stringArgument: string,
        onStringArgumentChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
        broadcast: () => void,
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
            activeDemo: 'getVersion',
            versionIsInternal: false,
            versionResult: '(not called)',
            calcFirst: '353',
            calcOperation: '+',
            calcSecond: '181',
            calcResult: '(not called)',
            eventName: FilteredEvent,
            eventFilter: '',
            subscriptionStatus: '(not subscribed)',
            subscriptions: [],
        };
    }

    private client?: JsonClient;

    private connect = async () => {
        try {
            this.client = new JsonClient(this.state.webSocketAddress);
            this.client.traceMessage = this.traceMessage;

            await this.client.connect();
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
    private editEventFilter = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ eventFilter: e.currentTarget.value });
    private clearEventLog = (e: React.MouseEvent<HTMLAnchorElement>) => this.setState({ eventLog: '' });
    private clearMessageLog = (e: React.MouseEvent<HTMLAnchorElement>) => this.setState({ messageLog: '' });
    private selectActiveDemo = (e: React.ChangeEvent<HTMLSelectElement>) => this.setState({ activeDemo: e.currentTarget.value as any });

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

    // subscribe to the given event
    public subscribeToEvent = async () => {
        if (this.client === undefined) {
            this.setState({
                subscriptionStatus: 'not connected! try connecting first'
            });
            return;
        }

        try {
            // subscribe and get unsubscription in return
            const eventName = this.state.eventName;
            const eventFilter = eventName === FilteredEvent ? { StringProperty: this.state.eventFilter } : undefined;
            const unsubscribeAsync = await this.client.subscribe({
                eventName,
                eventFilter,
                eventHandler: (args: any) => {
                    this.setState(oldState => ({
                        eventLog: oldState.eventLog +
                            eventName + ":" + JSON.stringify(args) + "\n"
                    }));
                },
            });

            // add event subscription to the component state
            const client = this.client;
            const rerender = () => this.setState(s => s);
            const subscription = {
                eventName: eventName === FilteredEvent ? `${eventName}(${this.state.eventFilter})` : eventName,
                stringArgument: '',
                onStringArgumentChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    // note: self-reference 'subscription' instead of 'this'
                    subscription.stringArgument = e.currentTarget.value;
                    rerender();
                },
                broadcast: async () => {
                    const msg = new EventBroadcaster();
                    msg.EventName = eventName;
                    if (eventName === FilteredEvent) {
                        // note: self-reference 'subscription' instead of 'this'
                        msg.StringArgument = subscription.stringArgument;
                    }
                    await client.call(msg);
                },
                unsubscribe: async () => {
                    try {
                        await unsubscribeAsync();
                        this.setState(oldState => ({
                            subscriptionStatus: 'unsubscribed from ' + this.state.eventName,
                            subscriptions: oldState.subscriptions.filter(v => v !== subscription)
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
                subscriptions: oldState.subscriptions.concat([ subscription ])
            }));
        } catch (e) {
            this.setState({
                subscriptionStatus: 'error: ' + e.message
            })
        }
    }

    public render() {
        const getVersionDemo = this.client && this.state.activeDemo === 'getVersion' ? (
            <div>
                <h2>GetVersion</h2>
                <label style={{ marginRight: 8 }}>
                    <input type="checkbox" checked={this.state.versionIsInternal} onChange={this.toggleVersionIsInternal}/>
                    Internal version details
                </label>
                <input type="button" value="GetVersion" onClick={this.getVersion} />
                <label style={{ marginLeft: 8 }}>
                    Result: {this.state.versionResult}
                </label>
            </div>
        ) : null;

        const calculateDemo = this.client && this.state.activeDemo === 'calculate' ? (
            <div>
                <h2>Calculate</h2>
                <input type="text" value={this.state.calcFirst} onChange={this.editFirst}/>
                <input type="text" value={this.state.calcOperation} onChange={this.editOperation}/>
                <input type="text" value={this.state.calcSecond} onChange={this.editSecond}/>
                <input type="button" value="=" onClick={this.calculate} />
                <label style={{ marginLeft: 8 }}>
                    Result: {this.state.calcResult}
                </label>
            </div>
        ) : null;

        const eventDemo = this.client && this.state.activeDemo === 'events' ? (
            <div>
                <h2>Subscribe and broadcast</h2>
                <input type="text" list="events" value={this.state.eventName} onChange={this.editEventName}/>
                <datalist id="events">
                    <option value="IFoo.AfterStartup" />
                    <option value="IBar.BeforeShutdown" />
                    <option value={FilteredEvent} />
                </datalist>
                {
                    (this.state.eventName === "FilteredEvent") &&
                    <input type="text" placeholder="Filter" value={this.state.eventFilter} onChange={this.editEventFilter} />
                }
                <input type="button" value="Subscribe to event" onClick={this.subscribeToEvent} />
                <label style={{ marginLeft: 8 }}>
                    Status: {this.state.subscriptionStatus}
                </label>
                {
                    // broadcast and unsubscription buttons
                    this.state.subscriptions.map((sub, index) => (
                        <div key={index} style={{ marginTop: 8 }}>
                            {
                                // display StringArgument editor for the filtered event
                                sub.eventName.startsWith(FilteredEvent) &&
                                <input type="text" value={sub.stringArgument} onChange={sub.onStringArgumentChange} />
                            }
                            <input type="button" value={"Broadcast event " + sub.eventName} onClick={sub.broadcast} />
                            <input type="button" value={"Unsubscribe from " + sub.eventName} onClick={sub.unsubscribe} />
                        </div>
                    ))
                }

                <h2>Event log (<a href="#" onClick={this.clearEventLog}>clear</a>)</h2>
                <pre>{this.state.eventLog}</pre>
            </div>
        ) : null;

        return (
            <div>
                <label>
                    Server address:
                    &nbsp;
                    <input type="text" value={this.state.webSocketAddress} onChange={this.editWebSocketAddress} />
                    <input type="button" value="Connect" onClick={this.connect} style={{ margin: 8 }}/>
                    <span>{this.state.webSocketStatus}</span>
                </label>

                <div>
                    <label>
                        Select a demo:
                        &nbsp;
                        <select value={this.state.activeDemo} onChange={this.selectActiveDemo}>
                            <option value='getVersion'>GetVersion service demo</option>
                            <option value='calculate'>Calculate service demo</option>
                            <option value='events'>Events and subscriptions demo</option>
                        </select>
                    </label>
                </div>

                {getVersionDemo}
                {calculateDemo}
                {eventDemo}

                <h2>JSON-RPC message log (<a href="#" onClick={this.clearMessageLog}>clear</a>)</h2>
                <pre>{this.state.messageLog}</pre>
            </div>
        );
    }
}

export default ServiceExecutor;