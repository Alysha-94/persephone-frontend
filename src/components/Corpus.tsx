import * as React from 'react';

import { Button, Card, Dimmer, Form, Header, Icon, Loader, Message, Modal, Radio, Segment, Table } from 'semantic-ui-react';

import { api } from '../API';

import { CorpusInfo, CorpusInformation, CorpusPostRequest, FeatureType, IDarray, LabelType, UtteranceInformation } from '../gen/api';

import CorpusCard from './CorpusCard';

enum UtteranceGroup {
    None,
    Training,
    Validation,
    Testing
}

interface IUtteranceSelection {
    uid: string;
    utteranceInfo: UtteranceInformation;
    group: UtteranceGroup;
}

export interface ICorpusState {
    corpuses: CorpusInformation[];
    isLoading: boolean;
    formErrorMessage: string;
    formFailed: boolean;
    formLoading: boolean;
    modalOpen: boolean;
    name?: string;
    labelType?: string;
    featureType?: string;
    formUtterances?: IUtteranceSelection[];
}

export default class Corpus extends React.Component<{}, ICorpusState> {
    constructor(props: any) {
        super(props);
        this.state = {
            corpuses: [],
            formErrorMessage: "No error.",
            formFailed: false,
            formLoading: false,
            isLoading: true,
            modalOpen: false
        };
        this.getData = this.getData.bind(this);
        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.submitForm = this.submitForm.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleUtteranceSelection = this.handleUtteranceSelection.bind(this);
    }

    public getData() {
        this.setState({isLoading: true});
        api.corpusGet().then(corpuses => {
            console.log(corpuses)
            this.setState({
                corpuses,
                isLoading: false,
            })
        });
    }

    public componentDidMount() {
        this.getData();
    }

    public openModal() {
        this.setState({
            formErrorMessage: "No error.",
            formFailed: false,
            formLoading: true,
            modalOpen: true
        })
        api.utteranceGet().then(utterances => {
            console.log(utterances)
            this.setState({
                formLoading: false,
                formUtterances: utterances.map(utterance => {return {
                    group: UtteranceGroup.None,
                    uid: utterance.id,
                    utteranceInfo: utterance,
                } as IUtteranceSelection}),
            })
        });
    }

    public closeModal() {
        this.setState({
            modalOpen: false
        })
    }

    public parseNumber(input: any): number {
        return Number.parseInt(input || "-1", 10) || -1;
    }

    public submitForm() {
        this.setState({formLoading: true})
        const corpusInfo: CorpusInfo = {
            featureType: this.state.featureType as FeatureType,
            labelType: this.state.labelType as LabelType,
            name: this.state.name || "undefined",
            testing: this.state.formUtterances!.filter(ut => ut.group === UtteranceGroup.Testing).map(ut => ut.utteranceInfo.id) as IDarray,
            training: this.state.formUtterances!.filter(ut => ut.group === UtteranceGroup.Training).map(ut => ut.utteranceInfo.id) as IDarray,
            validation: this.state.formUtterances!.filter(ut => ut.group === UtteranceGroup.Validation).map(ut => ut.utteranceInfo.id) as IDarray,
        }
        console.log(corpusInfo);
        const requestData: CorpusPostRequest = {
            corpusInfo
        }
        api.corpusPost(requestData).then(res => {
            this.setState({modalOpen: false});
            this.getData();
        }).catch(res => res.text()).then(err => {
            console.error(err);
            this.setState({formLoading: false, formFailed: true, formErrorMessage: "The error message is: " + err});
        });
    }

    handleChange = (field: string) => (event: any) => {
        this.setState({ [field]: event.target.value } as Pick<ICorpusState, any>);
    };

    handleUtteranceSelection = (uid: string, group: UtteranceGroup) => (event: any) => {
        console.log(uid, group);
        const newFormUtterances = this.state.formUtterances;
        newFormUtterances!.find(ut => ut.uid === uid)!.group = group;
        this.setState({formUtterances: newFormUtterances});
    }

    public render() {
        return (
            <div>
                <Header as='h1'>Corpuses</Header>
                <Button primary={true} onClick={this.openModal}>
                    <Icon name='upload' />
                    Create new corpus
                </Button>
                <Segment>
                    <Dimmer active={this.state.isLoading}>
                        <Loader>Loading</Loader>
                    </Dimmer>
                    <Card.Group>
                        {this.state.corpuses.map((corpus) => (
                            <CorpusCard key={corpus.id} corpus={corpus} />
                        ))}
                    </Card.Group>
                </Segment>
                <Modal
                    open={this.state.modalOpen}
                    onClose={this.closeModal}>
                    <Modal.Header>New corpus</Modal.Header>
                    <Modal.Content>
                        <Modal.Description>
                            <Form loading={this.state.formLoading} error={this.state.formFailed}>
                                <Header>Basic corpus information</Header>
                                <Form.Field>
                                    <Form.Input label="The name of this corpus" type="text" name="name" placeholder="Example Corpus" onChange={this.handleChange('name')} />
                                    <Form.Input label="The type of the labels" type="text" name="labelType" placeholder="phonemes" onChange={this.handleChange('labelType')} />
                                    <Form.Input label="The type of the features" type="text" name="featureType" placeholder="fbank" onChange={this.handleChange('featureType')} />
                                </Form.Field>
                                <Header>Choose utterances into training, validation, and testing groups</Header>
                                <Table basic='very'>
                                    <Table.Header>
                                    <Table.Row>
                                        <Table.HeaderCell>ID</Table.HeaderCell>
                                        <Table.HeaderCell>Audio</Table.HeaderCell>
                                        <Table.HeaderCell>Transcription</Table.HeaderCell>
                                        <Table.HeaderCell>Group</Table.HeaderCell>
                                    </Table.Row>
                                    </Table.Header>

                                    <Table.Body>
                                    {this.state.formUtterances && this.state.formUtterances.map((utterance) => (
                                        <Table.Row key={utterance.uid}>
                                            <Table.Cell>{utterance.utteranceInfo.id}</Table.Cell>
                                            <Table.Cell>{utterance.utteranceInfo.audio}</Table.Cell>
                                            <Table.Cell>{utterance.utteranceInfo.transcription}</Table.Cell>
                                            <Table.Cell>
                                                <Form.Group inline={true}>
                                                    <Form.Field>
                                                        <Radio label='Training' name={'uttGr'+utterance.utteranceInfo.id} value='this' checked={this.state.formUtterances!.find(ut => ut.uid === utterance.uid)!.group === UtteranceGroup.Training} onChange={this.handleUtteranceSelection(utterance.uid, UtteranceGroup.Training)}/>
                                                    </Form.Field>
                                                    <Form.Field>
                                                        <Radio label='Validation' name={'uttGr'+utterance.utteranceInfo.id} value='this' checked={this.state.formUtterances!.find(ut => ut.uid === utterance.uid)!.group === UtteranceGroup.Validation} onChange={this.handleUtteranceSelection(utterance.uid, UtteranceGroup.Validation)}/>
                                                    </Form.Field>
                                                    <Form.Field>
                                                        <Radio label='Testing' name={'uttGr'+utterance.utteranceInfo.id} value='this' checked={this.state.formUtterances!.find(ut => ut.uid === utterance.uid)!.group === UtteranceGroup.Testing} onChange={this.handleUtteranceSelection(utterance.uid, UtteranceGroup.Testing)}/>
                                                    </Form.Field>
                                                    <Form.Field>
                                                        <Radio label='None' name={'uttGr'+utterance.utteranceInfo.id} value='this' checked={this.state.formUtterances!.find(ut => ut.uid === utterance.uid)!.group === UtteranceGroup.None} onChange={this.handleUtteranceSelection(utterance.uid, UtteranceGroup.None)}/>
                                                    </Form.Field>
                                                </Form.Group>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                    </Table.Body>
                                </Table>
                                <Message id="errormessage" error={true} header='Corpus creation failed' content={this.state.formErrorMessage} />
                            </Form>
                        </Modal.Description>
                    </Modal.Content>
                    <Modal.Actions>
                        <Button primary={true} onClick={this.submitForm}>
                            <Icon name='plus' />
                            Create
                        </Button>
                        <Button negative={true} onClick={this.closeModal}>
                            <Icon name='remove' />
                            Cancel
                        </Button>
                    </Modal.Actions>
                </Modal>
            </div>
        )
    }
}