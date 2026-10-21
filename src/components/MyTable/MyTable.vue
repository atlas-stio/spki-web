<template>
    <div class="table-container">
        <!-- 表格主体 -->
        <table class="custom-table">
            <!-- 表头 -->
            <thead style="background-color: #f8f9fa">
                <tr>
                    <th v-for="(column, index) in columns" :key="index">
                        <el-text>{{ column.label }}</el-text>
                    </th>
                </tr>
            </thead>

            <!-- 表体 -->
            <tbody>
                <tr v-for="(row, rowIndex) in data" :key="rowIndex">
                    <td v-for="(column, colIndex) in columns" :key="colIndex">
                        <!-- 序号列 -->
                        <template v-if="column.type === 'index'">
                            <el-text>
                                <!-- 支持自定义序号计算函数，默认从1开始 -->
                                {{ column.indexMethod ? column.indexMethod(rowIndex, row) : rowIndex + 1 }}
                            </el-text>
                        </template>
                        <!-- 支持自定义单元格内容（插槽） -->
                        <template v-else-if="column.slot">
                            <el-text>
                                <slot :name="column.slot" :row="row" :index="rowIndex"></slot>
                            </el-text>
                        </template>
                        <!-- 默认显示字段值 -->
                        <template v-else>
                            <el-text>
                                {{ row[column.prop] }}
                            </el-text>
                        </template>
                    </td>
                </tr>
                <!-- 空数据提示 -->
                <tr v-if="data.length === 0">
                    <td :colspan="columns.length" class="empty-row">
                        {{ emptyText }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
export default {
    name: "MyTable",
    props: {
        // 表格数据
        data: {
            type: Array,
            default: () => [],
        },
        // 列配置
        columns: {
            type: Array,
            required: true,
            validator: (value) => {
                return value.every((col) => {
                    // 必须包含 label
                    if (!col.label) return false;

                    // 序号列不需要prop
                    if (col.type === "index") return true;

                    // 有 slot 的列可以没有 prop，无 slot 的列必须有 prop
                    if (!col.slot && !col.prop) return false;

                    return true;
                });
            },
        },
        // 空数据提示文本
        emptyText: {
            type: String,
            default: "暂无数据",
        },
    },
    data() {
        return {};
    },
    methods: {},
};
</script>

<style scoped>
table {
    width: 100%;
    border-collapse: collapse;
    font-family: Arial, sans-serif;
    /* 添加左右外边框 */
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
    border-top: 1px solid #ddd;
}

/* 表头样式 */
th {
    font-weight: bold;
    white-space: nowrap;
}

/* 表头和单元格通用样式 */
th,
td {
    padding: 8px 12px;
    text-align: left;
    border: none;
    border-bottom: 1px solid #ddd;
}

/* 鼠标悬停效果 */
tr:hover {
    background-color: #f5f7fa;
}

.empty-row {
    text-align: center;
    color: #9ca3af;
    padding: 32px;
}
</style>
