sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/util/File",
    "../model/formatter",
    'sap/ui/export/library',
    'sap/ui/export/Spreadsheet'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, File, formatter, exportLibrary, Spreadsheet) {
        "use strict";
        var EdmType = exportLibrary.EdmType;
        const oAppController = Controller.extend("it.orogel.edocument.controller.View1", {
            formatter: formatter,
            onInit: function () {
                this.oComponent = this.getOwnerComponent();
                this.oGlobalBusyDialog = new sap.m.BusyDialog();
                this.oGlobalBusyDialog.open();
                this.Search();
                this.oGlobalBusyDialog.close();
            },
            Search: function () {
                const oPromise = new Promise((resolve, reject) => {
                    this.getView().getModel().read("/eDocumentSet", {
                        success: (aData) => {
                            resolve(aData.results);
                        },
                        error: (oError) => {
                            reject();
                        }
                    });
                });
                oPromise.then((aResults) => {
                    this.setTableModel(aResults);
                }, oError => {
                    sap.m.MessageToast.show(this.oComponent.i18n().getText("msg.error.recuperodatiedocument.text"));
                });
            },
            setTableModel: function (aResults) {
                const oAppModel = this.getView().getModel("appModel");
                const oTable = this.getView().byId("Edocument");
                oAppModel.setProperty("/rows", aResults);
                oTable.setModel(oAppModel);
                oTable.bindRows("/rows");
                oAppModel.refresh(true);
            },
            onAction: function (oEvent) {
                let oTable = this.getView().byId("Edocument"),
                    aIndices = oTable.getSelectedIndices(),
                    aToSend = [],
                    bSend = oEvent.getSource().getProperty("icon") === "sap-icon://download" ? false : true;
                if (aIndices.length > 0) {
                    aIndices.forEach(i => {
                        let oRow = oTable.getContextByIndex(i).getObject();
                        let oToSend = {
                            "EdocGuid": oRow.EdocGuid,
                            "Send": bSend
                        };
                        aToSend.push(oToSend);
                    });

                    let oPromiseJSON = Promise.resolve();
                    aToSend.forEach(x => {
                        oPromiseJSON = oPromiseJSON.then(() => {
                            return this.createJSON(x);
                        });
                    });
                    Promise.all([oPromiseJSON]).then(() => {
                        let oPromiseXML = Promise.resolve();
                        aToSend.forEach(x => {
                            oPromiseXML = oPromiseXML.then(() => {
                                return this.createXML(x);
                            });
                        });
                        Promise.all([oPromiseXML]).then(() => {
                            this.Search();
                            sap.m.MessageToast.show("Successo");
                        }, () => {
                            sap.m.MessageToast.show("Errore di comunicazione");
                        });
                    }, () => {
                        sap.m.MessageToast.show("Errore di comunicazione");
                    });
                } else {
                    sap.m.MessageToast.show("Selezionare almeno una riga");
                }
            },
            createXML: function (oRow) {
                return new Promise((resolve, reject) => {
                    this.getView().getModel().create("/XMLSet", oRow, {
                        success: (oData) => {
                            if (!oRow.Send) {
                                File.save(oData.XMLData, oRow.EdocGuid, "xml", null, null);
                            }
                            resolve();
                        },
                        error: (oError) => {
                            reject(oError);
                        }
                    });
                });
            },
            createJSON: function (oRow) {
                return new Promise((resolve, reject) => {
                    this.getView().getModel().read("/XMLSet(guid'" + oRow.EdocGuid + "')", {
                        success: (oData) => {
                            oRow.JSONInput = oData.JSONInput;
                            resolve();
                        },
                        error: (oError) => {
                            reject(oError);
                        }
                    });
                });
            },
            onExport: function () {
                var aCols, oRowBinding, oSettings, oSheet, oTable;

                if (!this._oTable) {
                    this._oTable = this.getView().byId('Edocument');
                }

                oTable = this._oTable;
                oRowBinding = oTable.getBinding('rows');
                aCols = this.createColumnConfig();

                oSettings = {
                    workbook: { columns: aCols },
                    dataSource: oRowBinding,
                    fileName: 'Edocument.xlsx',
                    worker: false // We need to disable worker because we are using a Mockserver as OData Service
                };
                oSheet = new Spreadsheet(oSettings);
                oSheet.build().finally(function () {
                    oSheet.destroy();
                });
            },
            createColumnConfig: function () {
                var aCols = [];

                aCols.push({
                    label: 'Stato elabor.',
                    type: EdmType.String,
                    property: 'ProcStatus',
                    width: 20,
                    wrap: true
                });
                aCols.push({
                    label: 'eDocument: Guid',
                    type: EdmType.String,
                    property: 'EdocGuid',
                    width: 20,
                    wrap: true
                });
                aCols.push({
                    label: 'N. progressivo',
                    type: EdmType.String,
                    property: 'SeqNo',
                    width: 20,
                    wrap: true
                });
                aCols.push({
                    label: 'Società',
                    type: EdmType.String,
                    property: 'Bukrs',
                    width: 20,
                    wrap: true
                });
                aCols.push({
                    label: 'Paese',
                    type: EdmType.String,
                    property: 'Land',
                    width: 20,
                    wrap: true
                });
                aCols.push({
                    label: 'Tipo sorgente',
                    type: EdmType.String,
                    property: 'SourceType',
                    width: 20,
                    wrap: true
                });
                aCols.push({
                    label: 'Chiave sorgente',
                    type: EdmType.String,
                    property: 'SourceKey',
                    width: 20,
                    wrap: true
                });

                return aCols;
            },


        });
        return oAppController;
    });
