from app import app


if __name__ == '__main__':
    print('\n' + '=' * 60)
    print('🌐 FASILLINK AI API SERVER')
    print('=' * 60)
    print('\n🚀 Server running on http://localhost:5001')
    print('=' * 60 + '\n')
    app.run(host='0.0.0.0', port=5001, debug=True)