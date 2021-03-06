const app = getApp();
import "./../../utils/fix";
import _ from "./../../utils/lodash";
const util = require('../../utils/util.js');
import { http, chart } from "./../../utils/util";
import log from "./../../utils/log";

var parentTopChart = null, parentSecondChart = null, parentThirdChart = null;

Page({
    data: {
        vipExpireTime: "",
        ticketNumber: '',
        schoolId: '',
        class_: '',
        studentName: '',
        yearMonth: '',
        transcriptList: [],
        listMonth: [],
        subjectArray: [{ name: '语文', id: 1 }, { name: '数学', id: 2 }, { name: '英语', id: 3 }, { name: '生物', id: 4 }, { name: '物理', id: 5 }, { name: '地理', id: 6 }, { name: '政治', id: 7 }, { name: '历史', id: 8 }, { name: '化学', id: 10 }, { name: '体育', id: 11 }],
        subArray: ['语文', '数学', '英语', '生物', '物理', '地理', '政治', '历史', '化学', '体育'],
        subjectIndex: 0,
        activeTabIndex1: 0,
        activeTabIndex2: 0,
        objectiveQuestion: [],//客观题
        subjectiveQuestion: [],//主观题
        listResultObjectiveQuestion: [],//客观题答案列表
        listResultSubjectiveQuestion: [],//主观题答案列表
        objectiveAnswer: {},
        supervisorAnswer: {},
        classArray: [],
        ecTopChart: {
            lazyLoad: true
        },
        ecSecondChart: {
            lazyLoad: true
        },
        ecThirdChart: {
            lazyLoad: true
        },
        //是否购买了套餐
        whetherToBuy: false,
        pickupType: 1,//取件类型
        address: '',//取件地址
        isTeacherAccount: false
    },
    onLoad: function (option) {
        if (!_.isEmpty(option)) {
            this.setData({
                ticketNumber: option.ticketNumber,
                schoolId: option.schoolId,
                class_: option.class_,
                isTeacherAccount: option.isTeacherAccount
            })
        }
        wx.showLoading({ title: '加载中...', mask: true })
        this.getGradeAnalysis("", option);
        this.getStudentGrade(option);
        // this.checkWhetherToBuy();
    },
    onReady: function(){
        wx.hideLoading();
    },
    onHide: function(){
        this.printLogs();
    },
    onShow: function(){
        this.checkWhetherToBuy();
        this.printLogs();
    },
    //打印log
    printLogs: function(){
        log.info('info') 
        log.warn('warn')
        log.error('error')
        log.setFilterMsg('filterkeyword')
        log.setFilterMsg('addfilterkeyword')
    },
    onShareAppMessage: function (e) {
        return {
            title: '月考分析，全面深入了解孩子学习情况',
            path: '/pages/index/index?sendUid=' + app.globalData.id,
            imageUrl: '/imgs/share/share_02.jpg'
        }
    },
    onUnload: function () {
        this.firstComponent = null;
        this.secondComponent = null;
        this.thirdComponent = null;
    },
    //点击联系客服
    connectCustomerService: function(e){
    },
    //选择科目
    pickSubject: function (e) {
        this.setData({
            subjectIndex: e.detail.value,
            activeTabIndex1: 0,
            activeTabIndex2: 0
        })
        let option = {
            ticketNumber: this.data.ticketNumber,
            schoolId: this.data.schoolId,
            class_: this.data.class_
        }
        this.getGradeAnalysis((Number(e.detail.value) + 1), option)
    },
    //获取学生成绩表数据
    getStudentGrade: function (option) {
        let cmd = "/auth/parentStatisticalAnalysis/list";
        let data = _.assign({ weChatUserId: app.globalData.userId }, option);
        http.get({
            cmd,
            data,
            success: res => {
                if (_.get(res, 'data.code') === 200 && !_.isEmpty(_.get(res, 'data.data'))) {
                    let responseData = _.get(res, 'data.data');
                    let yearMonth = responseData.yearMonth.substr(0, 4) + '-' + responseData.yearMonth.substr(4, 5)
                    let studentName = responseData.studentName;
                    let class_ = responseData.class_;
                    let transcriptList = responseData.transcriptList;
                    let listMonth = responseData.listMonth;
                    let historicalGradeRanking = responseData.historicalGradeRanking;
                    for (let i = 0; i < transcriptList.length; i++) {
                        transcriptList[i].classAvgScore = util.returnFloat(transcriptList[i].classAvgScore)
                    }

                    this.setData({
                        class_,
                        yearMonth,
                        studentName,
                        transcriptList,
                        listMonth,
                        historicalGradeRanking
                    })
                    this.initFirstChart();
                } else if (_.get(res, 'data.code') === 107) {
                    wx.showModal({
                        title: '提示',
                        content: _.get(res, 'data.msg') || '暂无数据',
                        success(res) {
                            if (res.confirm) {
                                wx.navigateBack({ delta: 0, })
                            } else if (res.cancel) {
                                wx.navigateBack({ delta: 0, })
                            }
                        }
                    })
                }
            }
        })
    },
    //获取主客观题成绩分析数据
    getGradeAnalysis: function (subject, option) {
        const { subjectIndex, activeTabIndex1, activeTabIndex2 } = this.data;
        let cmd = "/auth/parentStatisticalAnalysis/analysisOfEachQuestion";
        let data = _.assign({
            weChatUserId: app.globalData.userId, subject: subject || (subjectIndex + 1)
        }, option);
        http.get({
            cmd,
            data,
            success: res => {
                if (_.get(res, 'data.code') === 200 && !_.isEmpty(_.get(res, 'data.data'))) {
                    let responseData = _.get(res, 'data.data');
                    let objectiveQuestion = responseData.objectiveQuestion;
                    let subjectiveQuestion = [];
                    let listResultObjectiveQuestion = responseData.listResultObjectiveQuestion;
                    for (let i = 0; i < listResultObjectiveQuestion.length; i++) {
                        listResultObjectiveQuestion[i].gradeCorrectAnswerRate = util.returnFloat(listResultObjectiveQuestion[i].gradeCorrectAnswerRate * 100);
                    }
                    let listResultSubjectiveQuestion = responseData.listResultSubjectiveQuestion;
                    for (let i = 0; i < listResultSubjectiveQuestion.length; i++) {
                        subjectiveQuestion.push(listResultSubjectiveQuestion[i].topic);
                        listResultSubjectiveQuestion[i].gradeScoreRate = util.returnFloat(listResultSubjectiveQuestion[i].gradeScoreRate * 100);
                    }
                    let objectiveAnswer = listResultObjectiveQuestion[activeTabIndex1];
                    let supervisorAnswer = listResultSubjectiveQuestion[activeTabIndex2];
                    supervisorAnswer.gradeAvgScore = _.round(supervisorAnswer.gradeAvgScore, 2);
                    supervisorAnswer.classAvgScore = _.round(supervisorAnswer.classAvgScore, 2);
                    this.setData({
                        objectiveQuestion,
                        subjectiveQuestion,
                        listResultObjectiveQuestion,
                        listResultSubjectiveQuestion,
                        objectiveAnswer,
                        supervisorAnswer
                    })
                    this.initSecondChart();
                    this.initThirdChart();
                }
            }
        })
    },
    checkWhetherToBuy: function () {
        let cmd = "/auth/pay/whetherToBuy";
        let timestamp = Date.parse(new Date());
        let data = { userId: app.globalData.userId, timestamp };
        http.get({
            cmd,
            data,
            success: res => {
                console.log(res, 'vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv');
                if (_.get(res, 'data.code') === 200) {
                    let whetherToBuy = _.get(res, 'data.data.whetherToBuy', false);
                    let vipExpireTime = _.get(res, 'data.data.vipExpireTime', "");
                    let pickupType = _.get(res, 'data.data.pickupType') == 1 ? '自助提货' : '快递配送';
                    let address = _.get(res, 'data.data.address');
                    this.setData({ whetherToBuy, vipExpireTime, pickupType, address });
                }
            }
        })
    },
    //题目切换
    swichNav: function (e) {
        const { listResultObjectiveQuestion, listResultSubjectiveQuestion } = this.data;
        let activeTabType = _.get(e, "currentTarget.dataset.type");

        if (activeTabType == 'objective') {//客观题选项
            let activeTabIndex1 = _.get(e, "currentTarget.dataset.current");
            if (this.data.activeTabIndex1 === e.target.dataset.current) {
                return false;
            }
            let objectiveAnswer = listResultObjectiveQuestion[activeTabIndex1];
            this.setData({ activeTabIndex1, objectiveAnswer })
        } else {//主观题选项
            let activeTabIndex2 = _.get(e, "currentTarget.dataset.current");
            if (this.data.activeTabIndex2 === e.target.dataset.current) {
                return false;
            }
            let supervisorAnswer = listResultSubjectiveQuestion[activeTabIndex2];
            supervisorAnswer.gradeAvgScore = _.round(supervisorAnswer.gradeAvgScore, 2);
            supervisorAnswer.classAvgScore = _.round(supervisorAnswer.classAvgScore, 2);
            this.setData({ activeTabIndex2, supervisorAnswer })
            this.initSecondChart();
            this.initThirdChart();
        }
    },
    //初始化 历史年级排名走势 图表
    initFirstChart: function () { 
        this.firstComponent = this.selectComponent('#parentTopChart');
        chart.initChart(this, 'parentTopChart', '#parentTopChart', parentTopChart);
    },
    //初始化 主观题得分分布 图表
    initSecondChart: function () {
        this.secondComponent = this.selectComponent('#parentSecondChart');
        chart.initChart(this, 'parentSecondChart', '#parentSecondChart', parentSecondChart);
    },
    //初始化 主观题得分分布 图表
    initThirdChart: function () {
        this.thirdComponent = this.selectComponent('#parentThirdChart');
        chart.initChart(this, 'parentThirdChart', '#parentThirdChart', parentThirdChart);
    },
    //获取 历史年级排名走势 option
    getStudentGradeTrendData() {
        const { listMonth, historicalGradeRanking, isTeacherAccount } = this.data;
        let gridSetting = {
            top: '30%',
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        };
        let legendData = { data: ['总分', '语文', '数学', '英语', '生物', '物理', '地理', '政治', '历史', '化学', '体育'] };
        let xData = listMonth.map(item => { return item.yearMonth });
        let yAxisInverse = true;
        let seriesArr = []
        for (let i = 0; i < historicalGradeRanking.length; i++) {
            let dataArr = [];
            for (let j = 0; j < historicalGradeRanking[i].list.length; j++) {
                dataArr.push(historicalGradeRanking[i].list[j].ranking);
            }
            seriesArr.push({
                name: historicalGradeRanking[i].subject,
                type: 'line',
                data: dataArr
            })
        }
        let seriesData = seriesArr;
        var tooltipSetting = {};
        if(isTeacherAccount == 'true'){//'老师端'
            tooltipSetting = {show:true, trigger: 'axis', position: ['15%', '0%'] };
        }else if(isTeacherAccount == 'false') {
            tooltipSetting = {show:false, trigger: 'axis', position: ['15%', '0%'] };
        }
        return chart.lineChartOption({ gridSetting, legendData, xData, yAxisInverse, seriesData, tooltipSetting });
    },
    //获取 年级平均得分分布图 option
    getStudentScoreRateData() {
        const { supervisorAnswer } = this.data;
        let scoreList = supervisorAnswer.list;
        let title = {
            text: '年级平均得分分布图',
            left: 'center',
            textStyle: {
                fontWeight: 'normal',
                fontSize: 16
            }
        }
        let subTitle = '';
        let colorData = ['#566b8e'];
        let xData = scoreList.map(item => { return item.score });
        let gridSetting = { left: "20%", top: "20%", bottom: "10%" };
        let tooltipSetting = {
            trigger: 'axis',
            axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                type: 'shadow'       // 默认为直线，可选为：'line' | 'shadow'
            },
            position: ['5%', '0%'],
            formatter: (params) => {
                const { subArray, subjectIndex } = this.data;
                let str = subArray[subjectIndex] + supervisorAnswer.topic + '(主观题)全年级得分率为' + params[0].value + '%';
                return str;
            }
        };
        let seriesLabel = {
            show: true,
            position: 'top',
            formatter: (params) => {
                if (params.value == 0) {
                    return ""
                }
                return params.value + "%";
            }
        }
        let seriesData = scoreList.map(item => { return _.round(item.rate * 100) });

        return chart.verticalBarChartOption({ title, colorData, xData, gridSetting, tooltipSetting, seriesData, seriesLabel, subTitle })
    },
    //获取 主观题得分分布 option
    getStudentScoreData() {
        const { supervisorAnswer } = this.data;
        // let scoreList = supervisorAnswer.listScoreCount;
        let scoreList = supervisorAnswer.classScoreRateList;
        let title = {
            text: '班级平均得分分布图',
            left: 'center',
            textStyle: {
                fontWeight: 'normal',
                fontSize: 16
            }
        }
        let subTitle = '';
        let colorData = ['#566b8e'];
        let xData = scoreList.map(item => { return item.score });
        let gridSetting = { left: "20%", top: "20%", bottom: "10%" };
        let tooltipSetting = {
            trigger: 'axis',
            axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                type: 'shadow'       // 默认为直线，可选为：'line' | 'shadow'
            },
            position: ['5%', '0%'],
            formatter: (params) => {
                const { subArray, subjectIndex } = this.data;
                let str = subArray[subjectIndex] + supervisorAnswer.topic + '(主观题)\n全班得分为' + params[0].axisValue + '分的有' + params[0].value + '人';
                return str;
            }
        };
        let seriesLabel = {
            show: true,
            position: 'top',
            formatter: (params) => {
                if (params.value == 0) {
                    return ""
                }
                return params.value + "%";
            }
        }
        // let seriesData = scoreList.map(item=>{ return item.scoreCount });
        let seriesData = scoreList.map(item => { return _.round(item.rate * 100) });

        return chart.verticalBarChartOption({ title, colorData, xData, gridSetting, tooltipSetting, seriesData, seriesLabel, subTitle })

    },
    //前往支付界面
    navToPayment: function () {
        wx.navigateTo({
            url: '/pages/payfor2/payfor2?schoolId=' + this.data.schoolId,
        })
    }
})