import request from "../utils/request.js";

/**
 * 请求函数模块 ajax 封装
 * @param {*} url 请求路径，默认为空
 * @param {*} method 请求方法，默认为GET
 * @param {*} params 请求参数，默认为空
 * @param {*} data 请求参数，默认为空
 * @param {*} config 额外的 axios 配置；支持 returnResponse 返回完整 response
 */
export default function ajax(url = "", method = "GET", params, data, config = {}) {
    const { returnResponse = false, ...axiosConfig } = config;
    return new Promise(function (resolve, reject) {
        const promise = request({
            method,
            url,
            params,
            data,
            ...axiosConfig,
        });
        promise
            .then((response) => {
                resolve(returnResponse ? response : response.data);
            })
            .catch((error) => {
                reject(error);
            });
    });
}
