FROM nginx:latest

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx Gateway configuration
COPY api/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Internal 9092)
EXPOSE 9092

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
