/** load model of transaksi */
const transaksiModel = require(`../models/index`).transaksi

/** load model of detail transaksi */
const detailModel = require(`../models/index`).detail_transaksi

/** load model of menu */
const menuModel = require(`../models/index`).menu

const Sequelize = require("sequelize")

/** create and export function to add transaksi */

exports.createNota = async (req, res) => {
    try {
        const transaksi = await transaksiModel.findOne({
            where: { id_transaksi: req.params.id_transaksi },
            include: [
                { model: detailModel, as: 'detail_transaksi', include: ['menu'] },
                { model: require('../models/index').meja, as: 'meja' },
                { model: require('../models/index').user, as: 'user' }
            ]
        })

        let htmlResponse = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Receipt</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 400px;
                    margin: auto;
                    border: 1px solid #ccc;
                    padding: 10px;
                }
                .receipt-header {
                    text-align: center;
                }
                .receipt-header h2 {
                    margin: 0;
                }
                .details {
                    margin-top: 20px;
                }
                .details div {
                    margin-bottom: 8px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                table, th, td {
                    border: 1px solid #ddd;
                }
                th, td {
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                .total {
                    text-align: right;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
        
            <div class="receipt-header">
                <h2>Wikusama Cafe</h2>
                <p>Nota</p>
            </div>
        
            <div class="details">
                <div><strong>Tanggal:</strong> ${transaksi.tgl_transaksi}</div>
                <div><strong>Transaksi ID:</strong> ${transaksi.id_transaksi}</div>
                <div><strong>Nama Pelanggan:</strong> ${transaksi.nama_pelanggan}</div>
                <div><strong>Meja Nomor:</strong> ${transaksi.meja.nomor_meja}</div>
                <div><strong>Kasir:</strong> ${transaksi.user.nama_user}</div>
            </div>
        
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${transaksi.detail_transaksi.map(detail => `
                        <tr>
                            <td>${detail.menu.nama_menu}</td>
                            <td>Rp ${detail.harga.toLocaleString()}</td>
                            <td>${detail.jumlah}</td>
                            <td>Rp ${(detail.harga * detail.jumlah).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="total">Total</td>
                        <td>Rp ${transaksi.detail_transaksi.reduce((acc, detail) => acc + (detail.harga * detail.jumlah), 0).toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>
        
            <p><strong>Status:</strong> ${transaksi.status}</p>
        
        </body>
        </html>
        `

        /** return HTML response */
        res.status(200).send(htmlResponse)
    } catch (error) {
        res.json({error: error})
    }
}

exports.addTransaksi = async (request, response) => {
    try {
        /** prepare data to add in transaksi */
        let newTransaksi = {
            tgl_transaksi: request.body.tgl_transaksi,
            id_user: request.body.id_user,
            id_meja: request.body.id_meja,
            nama_pelanggan: request.body.nama_pelanggan,
            status: `belum_bayar`
        }

        /** execute add transaksi using model */    
        let insertTransaksi = await transaksiModel.create(newTransaksi)

        /** get the lates id of new transaksi */
        let latesID = insertTransaksi.id_transaksi

        /** insert last ID in each of detail */
        /** assume that arrDetail is array type */
        let arrDetail = request.body.detail_transaksi

        /** loop each arrDetail to insert last ID
         * and harga
         */
        for (let i = 0; i < arrDetail.length; i++) {
            arrDetail[i].id_transaksi = latesID

            /** get selected menu based on id_menu */
            let selectedMenu = await menuModel.findOne({
                where: { id_menu: arrDetail[i].id_menu }
            })

            /** add harga in each of detail */
            arrDetail[i].harga = selectedMenu?.harga
        }

        /** execute insert detail transaksi using model */
        /** bulkCreate => create dalam jumlah besar */
        await detailModel.bulkCreate(arrDetail)

        /** give a response */
        return response.json({
            status: true,
            message: `Data transaksi telah ditambahkan`,
            id_transaksi: insertTransaksi.id_transaksi
        })

    } catch (error) {
        return response.json({
            status: false,
            message: error.message
        })
    }
}

/** create and export function to edit transaksi */
exports.updateTransaksi = async (request, response) => {
    try {
        /** get id that will be update */
        let id_transaksi = request.params.id_transaksi

        /** prepare data updated transakasi */
        let dataTransaksi = {
            tgl_transaksi: request.body.tgl_transaksi,
            id_user: request.body.id_user,
            id_meja: request.body.id_meja,
            nama_pelanggan: request.body.nama_pelanggan,
            status: request.body.status
        }

        /** execute update transaksi using model */
        await transaksiModel.update(
            dataTransaksi, { where: { id_transaksi: id_transaksi } }
        )

        /** execute delete all detail of selected transaksi */
        await detailModel.destroy({
            where: { id_transaksi: id_transaksi }
        })

        /** insert a new detail of transaksi */
        /** loop each arrDetail to insert last ID
         * and harga
         */
        let arrDetail = request.body.detail_transaksi
        for (let i = 0; i < arrDetail.length; i++) {
            arrDetail[i].id_transaksi = id_transaksi

            /** get selected menu based on id_menu */
            let selectedMenu = await menuModel.findOne({
                where: { id_menu: arrDetail[i].id_menu }
            })

            /** add harga in each of detail */
            arrDetail[i].harga = selectedMenu?.harga
        }

        /** insert new detail using model */
        await detailModel.bulkCreate(arrDetail)

        /** give a response */
        return response.json({
            status: true,
            message: `Data transaksai telah diubah`
        })

    } catch (error) {
        return response.json({
            status: false,
            message: error.message
        })
    }
}

/** create and export function to delete transaksi */
exports.deleteTransaksi = async (request, response) => {
    try {
        /** get id that will be delete */
        let id_transaksi = request.params.id_transaksi

        /** execute delete detail using model */
        await detailModel.destroy({
            where: { id_transaksi: id_transaksi }
        })

        /** execute delete transaksi using model */
        await transaksiModel.destroy({
            where: { id_transaksi: id_transaksi }
        })

        /** give a response */
        return response.json({
            status: true,
            message: `Data transaksi telah dihapus`
        })

    } catch (error) {
        return response.json({
            status: false,
            message: error.message
        })
    }
}

exports.getTransaksiByDate = async (req, res) => {
    try {
        // Extract the date parameter in dd.mm.yyyy format
        const dateParam = req.params.tanggal;

        // Split the date and convert it to 'YYYY-MM-DD' format
        console.log(dateParam)
        const [day, month, year] = dateParam.split('.');
        const formattedDate = `${year}-${month}-${day}`;  // e.g., '2024-07-06'

        // Query the transaksiModel for the given date
        let transaksiOnDate = await transaksiModel.findAll({
            where: Sequelize.where(
                Sequelize.fn('DATE', Sequelize.col('tgl_transaksi')),
                formattedDate
            ),
            include: [
                { model: detailModel, as: 'detail_transaksi', include: ['menu'] },
                { model: require('../models/index').meja, as: 'meja' },
                { model: require('../models/index').user, as: 'user' }
            ]
        });

        // Check if any transactions are found
        if (transaksiOnDate.length === 0) {
            return res.status(404).json({
                status: false,
                message: `No transactions found on ${formattedDate}`
            });
        }

        // Return the found transactions as a response
        return res.status(200).json({
            status: true,
            message: `Transactions found on ${formattedDate}`,
            data: transaksiOnDate
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

/** create and export function to get all transaksi */
exports.getTranskasi = async (request, response) => {
    try {
        /** get all data using model */
        let result = await transaksiModel
            .findAll({
                include: [
                    "meja",
                    "user",
                    {
                        model: detailModel,
                        as: "detail_transaksi",
                        include: ["menu"]
                    }
                ]
            })

        /** give a response */
        return response.json({
            status: true,
            data: result
        })

    } catch (error) {
        return response.json({
            status: false,
            message: error.message
        })
    }
}