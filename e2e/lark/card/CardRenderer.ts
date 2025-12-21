import {StepStatus, TestResult, TestStatus, TestStep, TestMethodInfo} from '../types/TestResult';

/**
 * 卡片渲染器 - 根据测试结果生成飞书卡片
 */
export class CardRenderer {
    // 展示文案常量
    private static readonly LABELS = {
        STATUS: 'Status',
        STARTED: 'Started',
        DURATION: 'Duration',
        RUNNING_TESTS: '🛠️ **正在执行的测试**',
        PROGRESS: '**Progress**',
        TEST_STEPS: '**✨ Test Steps**',
        VIEW_SCREENSHOTS: '📸 查看截图',
        SCREENSHOT_SUFFIX: '截图'
    } as const;

    private static readonly STATUS_TEXTS: Record<TestStatus, string> = {
        [TestStatus.PROCESSING]: 'Processing',
        [TestStatus.COMPLETED]: 'Success',
        [TestStatus.FAILED]: 'Failed',
        [TestStatus.CANCELLED]: 'Cancelled'
    };

    private static readonly HEADER_TITLES: Record<TestStatus, string> = {
        [TestStatus.PROCESSING]: '🚀 AI Processing',
        [TestStatus.COMPLETED]: '✅ Complete!',
        [TestStatus.FAILED]: '❌ Failed',
        [TestStatus.CANCELLED]: '⚠️ Cancelled'
    };

    private static readonly HEADER_TEMPLATES: Record<TestStatus, string> = {
        [TestStatus.PROCESSING]: 'turquoise',
        [TestStatus.COMPLETED]: 'green',
        [TestStatus.FAILED]: 'red',
        [TestStatus.CANCELLED]: 'grey'
    };

    private static readonly STEP_ICONS: Record<StepStatus, string> = {
        [StepStatus.PENDING]: '⏸️',
        [StepStatus.RUNNING]: '🔄',
        [StepStatus.SUCCESS]: '✅',
        [StepStatus.FAILED]: '❌',
        [StepStatus.SKIPPED]: '⏭️'
    };

    private static readonly STEP_COLORS: Record<StepStatus, string> = {
        [StepStatus.PENDING]: 'grey',
        [StepStatus.RUNNING]: 'blue',
        [StepStatus.SUCCESS]: 'green',
        [StepStatus.FAILED]: 'red',
        [StepStatus.SKIPPED]: 'grey'
    };

    private static readonly NOTES: Record<TestStatus, string> = {
        [TestStatus.PROCESSING]: '正在执行测试，请稍候...',
        [TestStatus.COMPLETED]: '🎉 所有任务已成功完成！',
        [TestStatus.FAILED]: '⚠️ 测试执行失败，请查看错误信息',
        [TestStatus.CANCELLED]: '⚠️ 测试已取消'
    };

    /**
     * 生成卡片
     */
    static render(testResult: TestResult, imageKeys?: Map<string, string>): any {
        const {status, userMessage, steps, startTime, totalDuration, totalSteps, testMethods, currentMethodIndex} = testResult;

        const progress = this.calculateProgress(steps, totalSteps);
        const currentStep = steps.findIndex(s => s.status === StepStatus.RUNNING) + 1;
        const total = totalSteps || steps.length; // 优先使用总步骤数
        const elements: any[] = [
            // 状态和时间信息
            {
                tag: 'div',
                fields: [
                    {
                        is_short: true,
                        text: {
                            tag: 'plain_text',
                            content: `${this.LABELS.STATUS}: ${this.getStatusText(status)}`
                        }
                    },
                    {
                        is_short: true,
                        text: {
                            tag: 'plain_text',
                            content: status === TestStatus.PROCESSING
                                ? `${this.LABELS.STARTED}: ${startTime.toLocaleTimeString('zh-CN')}`
                                : `${this.LABELS.DURATION}: ${this.formatDuration(totalDuration)}`
                        }
                    }
                ]
            },
            {
                tag: 'hr'
            }
        ];

        // 显示正在执行的测试方法名称
        if (userMessage) {
            elements.push({
                tag: 'markdown',
                content: `**🎯 测试任务：** ${userMessage}`
            });
        }

        // 测试方法列表（已废弃，保留兼容）
        if (testMethods && testMethods.length > 0) {
            const methodsContent = this.renderTestMethods(testMethods, currentMethodIndex);
            elements.push({
                tag: 'markdown',
                content: `${this.LABELS.RUNNING_TESTS}\n\n${methodsContent}`
            });
        }

        // 处理中显示进度
        if (status === TestStatus.PROCESSING && total > 0) {
            elements.push({
                tag: 'hr'
            });
            elements.push({
                tag: 'markdown',
                content: `${this.LABELS.PROGRESS}\n${progress}% - Step ${currentStep}/${total}`
            });
        }

        // 步骤列表
        if (steps.length > 0) {
            elements.push({
                tag: 'hr'
            });

            const stepsContent = steps
                .map(step => `${this.getStepStatusText(step.status)} **${step.name}** ${step.duration ? `- ${this.formatDuration(step.duration)}` : ''}`)
                .join('\n');

            elements.push({
                tag: 'markdown',
                content: `${this.LABELS.TEST_STEPS}\n\n${stepsContent}`
            });
        }

        // 添加截图折叠面板（如果有）
        const stepsWithScreenshots = steps.filter(s => s.screenshot);
        const hasScreenshots = stepsWithScreenshots.length > 0 && imageKeys;

        // 底部提示信息、错误信息和截图
        const noteContent = this.NOTES[status];
        const failedSteps = steps.filter(s => s.error);
        const hasErrors = failedSteps.length > 0;
        
        if (noteContent || hasErrors || hasScreenshots) {
            elements.push({
                tag: 'hr'
            });

            // 1. 提示信息
            if (noteContent) {
                elements.push({
                    tag: 'note',
                    elements: [{
                        tag: 'plain_text',
                        content: noteContent
                    }]
                });
            }
            
            // 2. 错误信息（显示完整错误）
            if (hasErrors) {
                const errorMessages = failedSteps
                    .map(step => {
                        const errorMsg = step.error || '';
                        return errorMsg;
                    })
                    .join('\n\n---\n\n');
                
                elements.push({
                    tag: 'markdown',
                    content: `**❌ 错误详情**\n\n${errorMessages}`
                });
            }
        }

        // 截图折叠面板（默认折叠）
        if (hasScreenshots) {
            const screenshotElements: any[] = [];
            stepsWithScreenshots.forEach(step => {
                const imgKey = imageKeys!.get(step.name);
                if (imgKey) {
                    screenshotElements.push({
                        tag: 'markdown',
                        content: `**${step.name}**`
                    });
                    screenshotElements.push({
                        tag: 'img',
                        img_key: imgKey,
                        alt: {
                            tag: 'plain_text',
                            content: `${step.name} ${this.LABELS.SCREENSHOT_SUFFIX}`
                        }
                    });
                }
            });

            if (screenshotElements.length > 0) {
                elements.push({
                    tag: 'collapsible_panel',
                    header: {
                        title: {
                            tag: 'plain_text',
                            content: this.LABELS.VIEW_SCREENSHOTS
                        }
                    },
                    expanded: false,
                    elements: screenshotElements
                });
            }
        }

        return {
            config: {
                wide_screen_mode: true
            },
            header: {
                title: {
                    tag: 'plain_text',
                    content: this.getHeaderTitle(status)
                },
                template: this.getHeaderTemplate(status)
            },
            elements
        };
    }

    /**
     * 获取状态对应的颜色主题
     */
    private static getHeaderTemplate(status: TestStatus): string {
        return this.HEADER_TEMPLATES[status];
    }

    /**
     * 获取状态对应的标题
     */
    private static getHeaderTitle(status: TestStatus): string {
        return this.HEADER_TITLES[status];
    }

    /**
     * 获取状态对应的显示文本
     */
    private static getStatusText(status: TestStatus): string {
        return this.STATUS_TEXTS[status];
    }

    /**
     * 获取步骤状态的显示文本
     */
    private static getStepStatusText(status: StepStatus): string {
        return `${this.STEP_ICONS[status]} <span color='${this.STEP_COLORS[status]}'>${status}</span>`;
    }

    /**
     * 格式化时长
     */
    private static formatDuration(ms?: number): string {
        if (!ms) return 'N/A';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }

    /**
     * 计算进度百分比
     */
    private static calculateProgress(steps: TestStep[], totalSteps?: number): number {
        const total = totalSteps || steps.length;
        if (total === 0) return 0;
        const completedSteps = steps.filter(
            s => s.status === StepStatus.SUCCESS ||
                s.status === StepStatus.FAILED ||
                s.status === StepStatus.SKIPPED
        ).length;
        return Math.round((completedSteps / total) * 100);
    }

    /**
     * 渲染测试方法列表
     * 最多展示3个：当前正在运行的 + 前一个 + 后一个
     */
    private static renderTestMethods(methods: TestMethodInfo[], currentIndex?: number): string {
        if (methods.length === 0) return '';
        
        const current = currentIndex ?? 0;
        const lines: string[] = [];
        
        // 计算显示范围
        let start = Math.max(0, current - 1);
        let end = Math.min(methods.length - 1, current + 1);
        
        // 调整以确保总是显示3个（如果有）
        if (end - start < 2 && methods.length >= 3) {
            if (start === 0) {
                end = Math.min(2, methods.length - 1);
            } else if (end === methods.length - 1) {
                start = Math.max(0, methods.length - 3);
            }
        }
        
        // 渲染方法列表
        for (let i = start; i <= end; i++) {
            const method = methods[i];
            const isRunning = i === current;
            
            if (isRunning) {
                // 当前正在运行的方法，绿色高亮
                lines.push(`<font color='green'>▶ ${method.name}</font>`);
            } else {
                // 其他方法，灰色显示
                lines.push(`<font color='grey'>○ ${method.name}</font>`);
            }
        }
        
        // 如果后面还有更多，显示...
        if (end < methods.length - 1) {
            lines.push(`<font color='grey'>...</font>`);
        }
        
        return lines.join('\n');
    }
}
