import React, { Component } from 'react';
import { compose } from 'recompose';
import { withAuthorization, withEmailVerification } from "../../containers/Session";
import { withFirebase } from "../../containers/Firebase";
import { withRouter } from 'react-router-dom';

import { Layout, Menu, Icon, Row, Col, Card, Table, Tag, Descriptions, Divider, Button, Skeleton, List, Tooltip, Dropdown, Drawer, Input, Radio, Checkbox, Switch } from 'antd'

import Alert from 'react-s-alert';

import _ from "lodash";

import axios from 'axios'
import moment from 'moment';
import 'moment/locale/pt-br';


const INITIAL_STATE = {
    isLoading: true,
    diagnostics: null,
    isNewNotationDrawerOpen: false,
    isEditDrawerOpen: false,
    isEditing: false,
    selectedPatient: null,
    anotations: null,
    touchpoints: [],
    isRegisteringAnnotation: false,
    hastes: [],
    status: [],
    medicalUnit: [],
}

const { Content, Sider } = Layout;

const { TextArea } = Input;

const RESPIRATORY_CHART = [
    "Tosse",
    "Dificuldade para respirar",
    "Coriza"
]

const CHRONIC_CHART = [
    "Diabetes",
    "Gestantes",
    "Doenças pulmonares",
    "Doença renais",
    "HIV",
    "Cancer",
    "Asma ou afins",
    "Doença cardíaca"
]

const TEMPERATURE = {
    "abaixo_de_37.7": "Abaixo de 37.7°",
    "igual_ou_acima_de_37.8": "Igual ou acima de 37.8°",
    "acima_de_39": "Acima de 39.0°",
}

class Dashboard extends Component {

    constructor() {
        super()
        this.state = { ...INITIAL_STATE }
    }

    componentDidMount() {
        Promise.all([
            this.getAxiosInstance().get('/common/hastes'),
            this.getAxiosInstance().get('/common/status'),
            this.getAxiosInstance().get('/medicalUnit'),
            this.getAxiosInstance().get('/diagnosis'),
        ]).then((values) => {
            let latestDiagnosisByKey = _
                .chain(values[3].data)
                .groupBy('key')
                .map((e) => _.last(_.sortBy(e, [(o) => o.createdAt._seconds])))
                .orderBy([(o) => o.haste.key])
                .value();
            console.log(latestDiagnosisByKey);
            this.setState({
                hastes: values[0].data,
                status: values[1].data,
                medicalUnit: values[2].data,
                isLoading: false,
                diagnostics: latestDiagnosisByKey
            })
        })
    }

    getAxiosInstance() {
        return axios.create({
            baseURL: ' https://us-central1-covid-19-b626a.cloudfunctions.net/',
            headers: {
                "Authorization": "Bearer " + (localStorage.getItem('authUser') && JSON.parse(localStorage.getItem('authUser')).jwtToken),
            },

        })
    }

    handleOpenNewNotationDrawer = (key) => {

        let selectedPatient = _.filter(this.state.diagnostics, (e) => e.key === key);
        this.setState({
            isNewNotationDrawerOpen: true,
            selectedPatient: selectedPatient[0],
            postData: selectedPatient[0]
        })

    }

    handleOpenEditDrawer = (key) => {
        let selectedPatient = _.first(_.filter(this.state.diagnostics, (e) => e.key === key));

        let postData = {
            ...selectedPatient,
            haste: selectedPatient.haste.id,
            status: selectedPatient.status.id,
            medicalUnit: selectedPatient.medicalUnit.id
        }

        this.setState({
            isEditDrawerOpen: true,
            selectedPatient: selectedPatient,
            postData: postData
        })
    }

    handleOpenGoogleMaps = (key) => {
        let selectedPatient = _.filter(this.state.diagnostics, (e) => e.key === key);
        window.open("https://www.google.com/maps/search/?api=1&query=" + selectedPatient[0].location.lat + "," + selectedPatient[0].location.lng + "", '_blank');
    }

    handleChangeStatus = (e) => {

        console.log(e.target.value);

        this.setState({
            postData: {
                ...this.state.postData,
                status: e.target.value
            }
        })


    }

    handleChangeHaste = (e) => {
        this.setState({
            postData: {
                ...this.state.postData,
                haste: e.target.value
            }
        })
    }

    handleRegisterAnotation = (e) => {
        this.setState({
            isRegisteringAnnotation: true
        })
        this.getAxiosInstance().post('/diagnosis/annotation', {
            key: this.state.selectedPatient.key,
            text: this.state.anotation
        }).then(() => {

            Alert.success("Anotação registrada! 📋", {
                position: 'bottom-right',
                effect: 'stackslide',
            });

            this.setState({
                isRegisteringAnnotation: false,
                isNewNotationDrawerOpen: false,
                anotation: null
            })

            window.location.reload();
        })
    }

    handleChangeAnnotation = (e) => {

        this.setState({
            anotation: e.target.value
        })
    }

    handleChangeRespiratoryChart = (e) => {
        this.setState({
            postData: {
                ...this.state.postData,
                respiratoryChart: e
            }
        })
    }

    handleAddTouchPoint = (e) => {
        const newTouchPoint = {
            key: this.state.selectedPatient.key,
            name: "",
            phone: "",
            isCompany: true
        };
        this.setState({
            touchpoints: [...this.state.touchpoints, newTouchPoint]
        });
    }

    handleChangeTouchpointRow = idx => e => {

        const touchpoints = [...this.state.touchpoints];

        if (e.target) {
            touchpoints[idx][e.target.name] = e.target.value;
        } else {
            touchpoints[idx].isCompany = e;
        }

        this.setState({
            touchpoints
        });

    }

    handleChangeObservationDays = (e) => {
        this.setState({
            postData: {
                ...this.state.postData,
                observationDays: e.target.value
            }
        })
    }

    handleEdit = (e) => {

        this.setState({
            isEditing: true,
        })

        this.getAxiosInstance().post("/diagnosis", this.state.postData).then(() => {

            // this.getAxiosInstance().post("/diagnosis/touchpoints", this.state.touchpoints).then(() => {

            Alert.success("Diagnostico atualizado! 📋", {
                position: 'bottom-right',
                effect: 'stackslide',
            });

            this.setState({
                isEditing: false,
                isEditDrawerOpen: false,
                postData: null
            })

            window.location.reload();
            // })
        })
    }

    render() {
        return (
            <Layout style={{ minHeight: '100vh' }} >
                <Sider style={{ background: "#fff", zIndex: 0 }} collapsed={true}>
                    <div style={{ padding: 10, textAlign: "center" }}>
                        <img width="40px" src="https://via.placeholder.com/40" alt="logo-empresa" />
                    </div>
                    <Menu mode="inline">
                        <Menu.Item key="1">
                            <Icon type="dashboard" />
                            <span>Dashboard</span>
                        </Menu.Item>
                        <Menu.Item className={"logout-menu-item"} key="2" onClick={this.props.firebase.doSignOut} >
                            <Icon type="logout" />
                            <span>Logout</span>
                        </Menu.Item>
                    </Menu>
                </Sider>
                <Content style={{ padding: '50px' }}>
                    <Row>
                        <Col md={24}>
                            <Card>
                                {
                                    this.state.isLoading ?
                                        <Skeleton active />
                                        :
                                        <div>
                                            <Button onClick={() => { window.open("https://covid-19-b626a.web.app", '_blank'); }} icon={"plus"} className={"btn-brand mr-15"} type="primary" style={{ marginBottom: 16 }}>
                                                Novo diagnóstico
                                            </Button>
                                            <Button onClick={() => { window.open("https://us-central1-covid-19-b626a.cloudfunctions.net/diagnosis/xls", '_blank'); }} icon={"file-excel"} className={"btn-neutral"} type="primary" style={{ marginBottom: 16 }}>
                                                Exportar para excel
                                            </Button>
                                            <Table
                                                pagination={{ pageSize: 50 }}
                                                dataSource={this.state.diagnostics}
                                                locale={{
                                                    emptyText: "Ainda não temos nenhum diagnóstico"
                                                }}
                                                columns={[
                                                    {
                                                        title: 'Crachá/CPF',
                                                        dataIndex: 'key',
                                                        key: '#key',
                                                    },
                                                    {
                                                        title: 'Nome',
                                                        dataIndex: 'name',
                                                        key: 'name',
                                                        sorter: (a, b) => a.name.localeCompare(b.name),
                                                        render: name => name ? _.replace(_.upperFirst(_.lowerCase(name)), "- ", "") : "Não informado"
                                                    },
                                                    {
                                                        title: 'Status',
                                                        dataIndex: 'status',
                                                        filters: this.state.status.map(e => {
                                                            return {
                                                                text: e.label,
                                                                value: e.id
                                                            }
                                                        }),
                                                        onFilter: (filterValue, record) => record.status.id === filterValue,
                                                        key: 'status',
                                                        render: status => <Tag>{status.label}</Tag>

                                                    },
                                                    {
                                                        title: 'Data',
                                                        dataIndex: 'createdAt',
                                                        key: 'createdAt',
                                                        render: createdAt => moment.unix(createdAt._seconds).format("L H:mm:ss")
                                                    },
                                                    {
                                                        title: 'Área',
                                                        dataIndex: 'medicalUnit',
                                                        key: 'medicalUnit',
                                                        filters: this.state.medicalUnit.map(e => {
                                                            return {
                                                                text: e.label,
                                                                value: e.id
                                                            }
                                                        }),
                                                        render: medicalUnit => medicalUnit ? medicalUnit.label : "#",
                                                        onFilter: (filterValue, record) => record.medicalUnit.id === filterValue
                                                    },
                                                    {
                                                        title: 'Origem',
                                                        dataIndex: 'origin',
                                                        key: 'origin',
                                                        render: origin => origin ? "Autoatendimento" : "Lider"
                                                    },
                                                    {
                                                        title: 'Urgência',
                                                        dataIndex: 'haste',
                                                        key: 'haste',
                                                        render: haste => <Tag color={haste.color}>{haste.label}</Tag>
                                                    },
                                                    {
                                                        title: '',
                                                        dataIndex: 'key',
                                                        key: 'key',
                                                        render: (key) =>
                                                            <Dropdown overlay={
                                                                <Menu>
                                                                    <Menu.Item onClick={() => { this.handleOpenEditDrawer(key) }}>Editar</Menu.Item>
                                                                    <Menu.Item onClick={() => { this.handleOpenNewNotationDrawer(key) }}>Nova anotação</Menu.Item>
                                                                    <Menu.Item onClick={() => { this.handleOpenGoogleMaps(key) }}>Ver no mapa</Menu.Item>
                                                                </Menu>
                                                            }>
                                                                <a href={"#"} className="ant-dropdown-link" onClick={e => e.preventDefault()}>
                                                                    Ações <Icon type="down" />
                                                                </a>
                                                            </Dropdown>
                                                    },
                                                ]}
                                                expandedRowRender={record =>
                                                    <div className={"mt-10"}>
                                                        <h3 className={"mb-10"}><Icon type={"user"} /> Dados gerais: </h3>
                                                        <Descriptions>
                                                            <Descriptions.Item label="Telefone">{record.phone}</Descriptions.Item>
                                                            <Descriptions.Item label="OBS">
                                                                <Tooltip placement={"bottomRight"} title={record.obs}>
                                                                    {
                                                                        _.truncate(record.obs)
                                                                    }
                                                                    <Icon className={"ml-10"} type={"info-circle"} />
                                                                </Tooltip>
                                                            </Descriptions.Item>
                                                            <Descriptions.Item label="Temperatura">{TEMPERATURE[record.temperature]}</Descriptions.Item>
                                                            <Descriptions.Item label="Viajou?"><Tag>{record.hasTravel ? "SIM" : "NÃO"}</Tag></Descriptions.Item>
                                                            <Descriptions.Item label="Quem informou">{record.sender.name} - {record.sender.email}</Descriptions.Item>
                                                            <Descriptions.Item label="Maior de 60 anos?"><Tag>{record.sixtyMore ? "SIM" : "NÃO"}</Tag></Descriptions.Item>
                                                            <Descriptions.Item label="Contato com suspeito de infeção?"><Tag>{record.contactSuspect ? "SIM" : "NÃO"}</Tag></Descriptions.Item>
                                                        </Descriptions>
                                                        <Divider />

                                                        <h3 className={"mb-10"}><Icon type={"warning"} /> Sintomas: {(_.isEmpty(record.respiratoryChart) && _.isEmpty(record.chronicChart)) && <small style={{ fontSize: 12, color: "#cccccc" }}><i>Nenhum sintoma foi informado para esse paciente no momento</i></small>}</h3>
                                                        {(!_.isEmpty(record.respiratoryChart) || !_.isEmpty(record.chronicChart)) &&
                                                            <Descriptions>
                                                                {
                                                                    !_.isEmpty(record.respiratoryChart) &&
                                                                    <Descriptions.Item label="Respiratórios">
                                                                        {record.respiratoryChart.map((e, i) =>
                                                                            <Tag color="geekblue" key={RESPIRATORY_CHART[e]}>{RESPIRATORY_CHART[e]}</Tag>
                                                                        )}
                                                                    </Descriptions.Item>
                                                                }
                                                                {
                                                                    !_.isEmpty(record.chronicChart) &&
                                                                    <Descriptions.Item label="Crônicos">
                                                                        {record.chronicChart.map((e, i) =>
                                                                            <Tag color="volcano" key={CHRONIC_CHART[e]}>{CHRONIC_CHART[e]}</Tag>
                                                                        )}
                                                                    </Descriptions.Item>
                                                                }
                                                            </Descriptions>
                                                        }
                                                        <Divider />

                                                        <h3 className={"mb-10"}><Icon type={"medicine-box"} /> Anotações médicas:  {_.isEmpty(record.annotations) && _.isEmpty(record.touchpoints) && <small style={{ fontSize: 12, color: "#cccccc" }}><i>Nenhuma anotação médica foi feita para esse paciente no momento</i></small>}</h3>
                                                        {(!_.isEmpty(record.annotations) || !_.isEmpty(record.touchpoints)) &&
                                                            <List
                                                                itemLayout="horizontal"
                                                                dataSource={_.reverse(_.sortBy([...record.annotations, ...record.touchpoints], [(o) => o.createdAt._seconds]))}
                                                                renderItem={item => (
                                                                    <List.Item>
                                                                        <List.Item.Meta
                                                                            description={
                                                                                <div>
                                                                                    <strong>{moment.unix(item.createdAt._seconds).format("L H:mm:ss")}</strong> - {item.text || (item.isCompany ? "O paciente teve contato com o funcionário da <nome-empresa> " + item.name + " com telefone: " + item.phone : "O paciente teve contato com " + item.name + " e o telefone para contato é: " + item.phone)}
                                                                                </div>
                                                                            }
                                                                        />
                                                                    </List.Item>
                                                                )}
                                                            />
                                                        }
                                                    </div>
                                                }
                                            >
                                            </Table>
                                            {this.state.postData &&
                                                <div>
                                                    <Drawer
                                                        width={600}
                                                        closable={true}
                                                        maskClosable={true}
                                                        visible={this.state.isNewNotationDrawerOpen}
                                                        onClose={() => { this.setState({ isNewNotationDrawerOpen: false }) }}
                                                        title={"Nova anotação médica"}
                                                    >
                                                        <TextArea value={this.state.anotation} onChange={this.handleChangeAnnotation} placeholder={"Anotações..."} rows={10} />

                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                left: 0,
                                                                bottom: 0,
                                                                width: '100%',
                                                                borderTop: '1px solid #e9e9e9',
                                                                padding: '10px 16px',
                                                                background: '#fff',
                                                                textAlign: 'right',
                                                            }}
                                                        >
                                                            <Button loading={this.state.isRegisteringAnnotation} block icon="plus" onClick={this.handleRegisterAnotation} type="primary" className="btn-brand">
                                                                Adicionar anotação
                                                            </Button>
                                                        </div>
                                                    </Drawer>
                                                    <Drawer
                                                        width={600}
                                                        closable={true}
                                                        maskClosable={true}
                                                        visible={this.state.isEditDrawerOpen}
                                                        onClose={() => { this.setState({ isEditDrawerOpen: false }) }}
                                                        title={
                                                            "Editar dados do paciente: " + this.state.selectedPatient.name
                                                        }
                                                    >

                                                        <p><strong>Status atual do paciente: </strong></p>
                                                        <Radio.Group size={"small"} onChange={this.handleChangeStatus}>
                                                            {
                                                                this.state.status.map(e =>
                                                                    <Radio.Button
                                                                        key={e.id}
                                                                        checked={e.id === this.state.postData.status}
                                                                        value={e.id}>
                                                                        {e.label}
                                                                    </Radio.Button>
                                                                )
                                                            }
                                                        </Radio.Group>
                                                        <Divider />
                                                        {/*Se status observação*/}
                                                        {this.state.postData.status == "S84ju8bNFFlzAw8iLfZ8" &&
                                                            <div>
                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                                    <span>
                                                                        Ok... E quantos dias deve ficar em observação?
                                                                    </span>
                                                                    <Input value={this.state.postData.observationDays} type={"number"} onChange={this.handleChangeObservationDays} placeholder={"Nº de dias"} style={{ width: "120px" }} />
                                                                </div>
                                                                <Divider />
                                                            </div>
                                                        }
                                                        <p><strong>Sintomas apresentados: </strong></p>
                                                        <Checkbox.Group value={this.state.postData.respiratoryChart} onChange={this.handleChangeRespiratoryChart} style={{ width: '100%' }}>
                                                            <Row gutter={30}>
                                                                {
                                                                    RESPIRATORY_CHART.map((e, i) =>
                                                                        <Col key={i} span={Math.floor(24 / RESPIRATORY_CHART.length)}>
                                                                            <Checkbox className={"custom-checkbox"} key={i} value={_.findIndex(RESPIRATORY_CHART, (o) => { return o === e })} >{e}</Checkbox>
                                                                        </Col>
                                                                    )
                                                                }
                                                            </Row>
                                                        </Checkbox.Group>
                                                        <Divider />

                                                        <p><strong>Nivel de urgência: </strong></p>
                                                        <Radio.Group size={"small"} style={{ width: "100%" }} onChange={this.handleChangeHaste}>
                                                            {
                                                                this.state.hastes.map(e =>
                                                                    <Radio.Button
                                                                        style={{ width: (100 / this.state.hastes.length) + "%" }}
                                                                        key={e.id}
                                                                        checked={e.id === this.state.postData.haste}
                                                                        value={e.id}>
                                                                        {e.label}
                                                                    </Radio.Button>
                                                                )
                                                            }
                                                        </Radio.Group>
                                                        <Divider />


                                                        <div className={"mb-15"} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                            <strong>Adicione as pessoas com que esse paciente teve contato. </strong>
                                                            <Button onClick={this.handleAddTouchPoint} className={"btn-brand"} icon={"plus"} />
                                                        </div>


                                                        <table className={"mb-50"} style={{ width: "100%" }}>
                                                            <thead className="ant-table-thead">
                                                                <tr>
                                                                    <th>Nome</th>
                                                                    <th>Telefone</th>
                                                                    <th>É nome-empresa?</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="ant-table-tbody">
                                                                {
                                                                    !_.isEmpty(this.state.touchpoints) &&
                                                                    this.state.touchpoints.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td>
                                                                                <Input
                                                                                    placeholder="Name"
                                                                                    name="name"
                                                                                    value={this.state.touchpoints[idx].name}
                                                                                    onChange={this.handleChangeTouchpointRow(idx)}
                                                                                    className="form-control"
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <Input
                                                                                    placeholder="Telefone"
                                                                                    name="phone"
                                                                                    value={this.state.touchpoints[idx].phone}
                                                                                    onChange={this.handleChangeTouchpointRow(idx)}
                                                                                    className="form-control"
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <Switch
                                                                                    name="isCompany"
                                                                                    checked={this.state.touchpoints[idx].isCompany}
                                                                                    onChange={this.handleChangeTouchpointRow(idx)}
                                                                                    className="form-control"
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    ))

                                                                }
                                                            </tbody>
                                                        </table>


                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                left: 0,
                                                                bottom: 0,
                                                                width: '100%',
                                                                borderTop: '1px solid #e9e9e9',
                                                                padding: '10px 16px',
                                                                background: '#fff',
                                                                textAlign: 'right',
                                                            }}
                                                        >
                                                            <Button loading={this.state.isEditing} block icon="sync" onClick={this.handleEdit} type="primary" className="btn-brand">
                                                                Atualizar
                                                            </Button>
                                                        </div>
                                                    </Drawer>
                                                </div>
                                            }
                                        </div>
                                }
                            </Card>
                        </Col>
                    </Row>
                </Content >
            </Layout >
        );
    }
}

const condition = authUser => !!authUser; // just check if its not null
export default compose(
    withEmailVerification,
    withAuthorization(condition),
    withRouter,
    withFirebase,
)(Dashboard);