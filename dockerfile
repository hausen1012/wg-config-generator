FROM nginx:alpine

# 复制项目文件到nginx默认目录
COPY . /usr/share/nginx/html/

# 暴露80端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]